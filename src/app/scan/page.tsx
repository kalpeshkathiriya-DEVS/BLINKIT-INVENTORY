'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getInventoryStore, PurchaseOrder, PoItem, PoScan } from '../../lib/store/inventory-store';
import { useAuth } from '../../lib/auth-context';

export default function TeamScanningPage() {
  const store = getInventoryStore();
  const { user } = useAuth();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  const [staffName, setStaffName] = useState<string>(user?.name || 'Ravi Kumar');

  useEffect(() => {
    if (user?.name) setStaffName(user.name);
  }, [user]);

  const [scannedCode, setScannedCode] = useState<string>('');
  const [multiplier, setMultiplier] = useState<number>(1);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);
  const [recentScans, setRecentScans] = useState<PoScan[]>([]);

  // Camera Barcode Scanner States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStarting, setCameraStarting] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [decodingFile, setDecodingFile] = useState<boolean>(false);

  // Permission Access Popup Modal State
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [permissionStep, setPermissionStep] = useState<'prompt' | 'chrome' | 'safari' | 'http'>('prompt');

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Load orders
  useEffect(() => {
    const openOrders = store.purchaseOrders.filter(
      p => p.status === 'new' || p.status === 'reserved' || p.status === 'in_progress'
    );
    setOrders(openOrders);

    if (openOrders.length > 0 && !selectedPoId) {
      setSelectedPoId(openOrders[0].id);
      setSelectedPo(openOrders[0]);
    }
  }, []);

  useEffect(() => {
    if (selectedPoId) {
      const po = store.purchaseOrders.find(p => p.id === selectedPoId) || null;
      setSelectedPo(po);
      if (po && po.items.length > 0 && !selectedItemId) {
        setSelectedItemId(po.items[0].id);
      }
      setRecentScans(store.poScans.filter(s => s.poId === selectedPoId).slice(-10).reverse());
    }
  }, [selectedPoId]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Audio feedback synthesizer
  const playBeep = (isSuccess: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (isSuccess) {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // Low buzz A3
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch {}
  };

  // Mobile haptic vibration feedback
  const triggerVibrate = (isSuccess: boolean) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        if (isSuccess) {
          navigator.vibrate(100);
        } else {
          navigator.vibrate([150, 100, 150]);
        }
      }
    } catch {}
  };

  // Core scan execution logic
  const processScannedCode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    if (!selectedPo) {
      setScanMessage({ type: 'error', text: 'Please select a Release Order first.' });
      return;
    }

    // Match by UPC or Channel Item Code
    let targetItem = selectedPo.items.find(
      it => it.blinkitUpc === code || it.channelItemCode === code
    );

    // If not found by UPC, check if manual line item is selected
    if (!targetItem && selectedItemId) {
      targetItem = selectedPo.items.find(it => it.id === selectedItemId);
    }

    if (!targetItem) {
      playBeep(false);
      triggerVibrate(false);
      setFlashColor('red');
      setScanMessage({
        type: 'error',
        text: `Wrong Item: Code ${code} does not exist in R.O. #${selectedPo.poNumber}`,
      });
      setTimeout(() => setFlashColor(null), 600);
      return;
    }

    try {
      const result = store.scanItem({
        poItemId: targetItem.id,
        scannedCode: code,
        qty: multiplier,
        userName: staffName,
      });

      playBeep(true);
      triggerVibrate(true);
      setFlashColor('green');
      setScanMessage({
        type: 'success',
        text: `+${multiplier} Scanned: ${targetItem.itemName} (${result.scannedQty}/${result.requestedQty})`,
      });
      setTimeout(() => setFlashColor(null), 400);

      // Refresh state
      setSelectedPo({ ...selectedPo });
      setRecentScans(store.poScans.filter(s => s.poId === selectedPo.id).slice(-10).reverse());
      inputRef.current?.focus();
    } catch (err: any) {
      playBeep(false);
      triggerVibrate(false);
      setFlashColor('red');
      setScanMessage({
        type: 'error',
        text: err.message, // Plain language e.g. "Over quantity: PO needs 150, already scanned 150"
      });
      setTimeout(() => setFlashColor(null), 800);
    }
  };

  // Handle manual form submission
  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedCode.trim()) return;
    const code = scannedCode;
    setScannedCode('');
    processScannedCode(code);
  };

  // Handle image snap file scanning (Works on ALL mobile devices without HTTPS or permission barriers)
  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDecodingFile(true);
    setScanMessage({ type: 'success', text: '📷 Decoding barcode from camera snap…' });

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      // Create hidden element if not present
      const decoderId = 'barcode-file-decoder-temp';
      let decoderEl = document.getElementById(decoderId);
      if (!decoderEl) {
        decoderEl = document.createElement('div');
        decoderEl.id = decoderId;
        decoderEl.style.display = 'none';
        document.body.appendChild(decoderEl);
      }

      const html5QrCode = new Html5Qrcode(decoderId);
      const decodedText = await html5QrCode.scanFile(file, false);
      html5QrCode.clear();

      if (decodedText) {
        processScannedCode(decodedText);
      }
    } catch (err: any) {
      playBeep(false);
      triggerVibrate(false);
      setFlashColor('red');
      setScanMessage({
        type: 'error',
        text: 'Could not detect barcode from photo. Please hold the phone steady, focus on the barcode, and try again.',
      });
      setTimeout(() => setFlashColor(null), 1000);
    } finally {
      setDecodingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Check camera permission & trigger browser permission dialog
  async function requestBrowserPermission() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        // Permission granted! Stop test stream and start scanner
        stream.getTracks().forEach(t => t.stop());
        setShowPermissionModal(false);
        await startCamera();
      } else {
        // Non-secure context or no mediaDevices
        setPermissionStep('http');
      }
    } catch (err: any) {
      console.warn('getUserMedia permission error:', err);
      // Check user agent for specific instructions
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('safari') && !ua.includes('chrome')) {
        setPermissionStep('safari');
      } else {
        setPermissionStep('chrome');
      }
    }
  }

  // Camera Barcode Scanner Start
  async function startCamera(mode = facingMode) {
    // Check if secure context
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // Insecure HTTP on mobile IP - browser may block getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setShowPermissionModal(true);
        setPermissionStep('http');
        return;
      }
    }

    setCameraStarting(true);
    setCameraError(null);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
      }

      const qrCodeScanner = new Html5Qrcode('barcode-reader');
      html5QrCodeRef.current = qrCodeScanner;

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      await qrCodeScanner.start(
        { facingMode: mode },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.floor(viewfinderWidth * 0.85);
            const height = Math.floor(Math.min(width * 0.55, 180));
            return { width, height };
          },
          formatsToSupport,
        },
        (decodedText) => {
          // Cooldown check: prevent duplicate reading of same barcode within 1.2s
          const now = Date.now();
          if (
            lastScannedTimeRef.current.code === decodedText &&
            now - lastScannedTimeRef.current.time < 1200
          ) {
            return;
          }
          lastScannedTimeRef.current = { code: decodedText, time: now };
          processScannedCode(decodedText);
        },
        () => {
          // Frame read callback without barcode
        }
      );

      setIsCameraActive(true);
      setShowPermissionModal(false);
    } catch (err: any) {
      console.error('Camera activation error:', err);
      // Show permission popup modal
      setShowPermissionModal(true);
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('iphone') || ua.includes('safari') && !ua.includes('chrome')) {
        setPermissionStep('safari');
      } else if (!window.isSecureContext) {
        setPermissionStep('http');
      } else {
        setPermissionStep('chrome');
      }
      setCameraError(err.message || 'Camera permission required.');
      setIsCameraActive(false);
    } finally {
      setCameraStarting(false);
    }
  }

  // Camera Stop
  async function stopCamera() {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
    setTorchOn(false);
  }

  // Toggle Torch / Flashlight
  async function toggleTorch() {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        const nextState = !torchOn;
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (e) {
        alert('Torch is not supported by your mobile device camera.');
      }
    }
  }

  // Flip Camera Front / Back
  async function flipCamera() {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await stopCamera();
    await startCamera(nextMode);
  }

  // Void Scan
  const handleVoidScan = (scanId: string) => {
    if (!confirm('Are you sure you want to void this scan?')) return;
    try {
      store.voidScan(scanId, 'Staff requested void');
      if (selectedPo) {
        setSelectedPo({ ...selectedPo });
        setRecentScans(store.poScans.filter(s => s.poId === selectedPo.id).slice(-10).reverse());
      }
      setScanMessage({ type: 'success', text: 'Scan voided successfully.' });
    } catch (err: any) {
      setScanMessage({ type: 'error', text: `Cannot void scan: ${err.message}` });
    }
  };

  const totalRequested = selectedPo?.items.reduce((s, i) => s + i.requestedQty, 0) || 0;
  const totalScanned = selectedPo?.items.reduce((s, i) => s + i.scannedQty, 0) || 0;
  const progressPercent = totalRequested > 0 ? Math.round((totalScanned / totalRequested) * 100) : 0;

  // Breakdown of scans per staff
  const staffBreakdown: Record<string, number> = {};
  if (selectedPo) {
    store.poScans
      .filter(s => s.poId === selectedPo.id && !s.isVoided)
      .forEach(s => {
        staffBreakdown[s.userName] = (staffBreakdown[s.userName] || 0) + s.qty;
      });
  }

  return (
    <div className={`space-y-4 transition-colors duration-200 ${
      flashColor === 'green' ? 'bg-emerald-100/50' : flashColor === 'red' ? 'bg-rose-100/50' : ''
    }`}>
      {/* Hidden Native Camera File Input for direct photo snap */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageFileSelected}
      />

      {/* Top Header Controls: PO Selector & Active Staff */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-auto flex-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Select Release Order (R.O.)</label>
          <select
            value={selectedPoId}
            onChange={e => setSelectedPoId(e.target.value)}
            className="w-full mt-0.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {orders.map(o => (
              <option key={o.id} value={o.id}>
                R.O. #{o.poNumber} &bull; {o.deliveryLocation} ({o.items.reduce((s, i) => s + i.scannedQty, 0)}/{o.totalQty})
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Logged-in Floor Staff</label>
          <div className="flex space-x-1.5 mt-0.5">
            {['Ravi Kumar', 'Priya Patel', 'Amit Shah'].map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setStaffName(name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  staffName === name
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Card & Per-Staff Counter */}
      {selectedPo && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold">Total Fulfillment Progress</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {totalScanned} / {totalRequested} units{' '}
                <span className="text-base font-bold text-emerald-600">({progressPercent}%)</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-semibold">Active Staff Scans</span>
              <div className="flex flex-wrap gap-1.5 justify-end mt-1">
                {Object.entries(staffBreakdown).map(([name, count]) => (
                  <span key={name} className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {name}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* PRIMARY FEATURE: LIVE CAMERA BARCODE SCANNER SCREEN & SNAP SCANNER */}
      <div className="bg-white p-5 rounded-3xl border-2 border-emerald-500 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-base font-black text-slate-900">
              Mobile Barcode Scanner
            </h2>
          </div>
          {isCameraActive && (
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black rounded-full text-[10px] uppercase">
              Camera Live
            </span>
          )}
        </div>

        {/* Camera Launch or Active Viewfinder */}
        {!isCameraActive ? (
          <div className="p-5 bg-gradient-to-br from-emerald-50 via-white to-amber-50 border border-emerald-200 rounded-2xl text-center space-y-4">
            <div className="text-4xl">📸</div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Scan Barcodes with Mobile Camera</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                Scan Code128, EAN-13, and UPC barcodes instantly on any smartphone.
              </p>
            </div>

            {/* TWO POWERFUL WAYS TO SCAN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Option 1: Native Phone Camera Snap (Zero Permission Barriers - Works 100% on HTTP) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={decodingFile}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{decodingFile ? '⏳' : '📷'}</span>
                <span>{decodingFile ? 'Decoding Photo…' : 'Take Photo to Scan'}</span>
              </button>

              {/* Option 2: Live Continuous Video Stream Scanner */}
              <button
                type="button"
                onClick={() => startCamera()}
                disabled={cameraStarting}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{cameraStarting ? '⏳' : '📹'}</span>
                <span>{cameraStarting ? 'Opening…' : 'Live Video Scanner'}</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPermissionModal(true);
                  setPermissionStep('prompt');
                }}
                className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center justify-center gap-1 mx-auto"
              >
                <span>⚙️</span>
                <span>Camera access not working? Open Permission Help</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Viewfinder Container */}
            <div className="relative overflow-hidden rounded-2xl bg-black border-2 border-emerald-600">
              <div id="barcode-reader" className="w-full min-h-[260px] sm:min-h-[320px]" />

              {/* Animated Laser Scanning Line */}
              <div className="absolute inset-x-8 top-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] pointer-events-none animate-pulse" />

              {/* Floating Camera Controls */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl text-xs font-bold shadow-md transition-all ${
                    torchOn ? 'bg-amber-400 text-amber-950' : 'bg-black/60 text-white hover:bg-black/80'
                  }`}
                  title="Toggle Torch / Flashlight"
                >
                  💡 Flash
                </button>
                <button
                  type="button"
                  onClick={flipCamera}
                  className="p-2 rounded-xl text-xs font-bold bg-black/60 text-white hover:bg-black/80 shadow-md"
                  title="Flip Front / Rear Camera"
                >
                  🔄 Flip
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md"
                  title="Close Camera"
                >
                  ✕ Close
                </button>
              </div>

              {/* Guide Overlay */}
              <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
                <span className="px-3 py-1 bg-black/70 text-white rounded-full text-[11px] font-semibold">
                  Align barcode inside the box to scan automatically
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={stopCamera}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors"
            >
              Close Live Camera
            </button>
          </div>
        )}

        {/* Multiplier Quick Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700">Scan Multiplier:</span>
          <div className="flex space-x-1.5">
            {[1, 12, 25].map(qty => (
              <button
                key={qty}
                type="button"
                onClick={() => setMultiplier(qty)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  multiplier === qty
                    ? 'bg-amber-400 text-amber-950 shadow-sm scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                +{qty} {qty === 1 ? 'Unit' : qty === 12 ? 'Inner' : 'Carton'}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Barcode / UPC Backup Input */}
        <form onSubmit={handleManualScanSubmit} className="pt-2 border-t border-slate-100 space-y-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase">
            Manual Barcode / UPC Input (Backup)
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={scannedCode}
              onChange={e => setScannedCode(e.target.value)}
              placeholder="Type UPC (e.g. 21713050) or use scanner..."
              className="flex-1 p-3 border-2 border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-sm transition-colors"
            >
              Submit Scan
            </button>
          </div>
        </form>

        {/* Live Notification Feedback Toast */}
        {scanMessage && (
          <div className={`p-4 rounded-xl text-sm font-bold flex items-center space-x-2 shadow-sm ${
            scanMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-100 text-rose-900 border border-rose-300'
          }`}>
            <span>{scanMessage.type === 'success' ? '✓' : '✖'}</span>
            <span>{scanMessage.text}</span>
          </div>
        )}
      </div>

      {/* Line Items Checklist */}
      {selectedPo && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">
              R.O. Line Items Checklist ({selectedPo.items.length} SKUs)
            </span>
            <span className="text-xs text-slate-400">Tap SKU to select</span>
          </div>

          <div className="divide-y divide-slate-100">
            {selectedPo.items.map(item => {
              const isComplete = item.scannedQty >= item.requestedQty;
              const remaining = Math.max(item.requestedQty - item.scannedQty, 0);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setScannedCode(item.blinkitUpc);
                  }}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                    isComplete
                      ? 'bg-emerald-50/40 text-slate-700'
                      : selectedItemId === item.id
                      ? 'bg-amber-50/50'
                      : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-600">
                        UPC: {item.blinkitUpc}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Code: {item.channelItemCode}
                      </span>
                      {isComplete && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                          DONE
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm mt-0.5 text-slate-900">
                      {item.itemName}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-slate-900">
                      {item.scannedQty} / {item.requestedQty}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {remaining > 0 ? `${remaining} remaining` : 'Complete'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Scans Log with Void capability */}
      {recentScans.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Recent Scans (Undo within 2 mins)
          </div>
          <div className="space-y-1.5">
            {recentScans.map(scan => (
              <div
                key={scan.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800">{scan.userName}</span>{' '}
                  scanned <strong className="font-mono">{scan.scannedCode}</strong> (+{scan.qty})
                  <span className="text-slate-400 ml-2">
                    {new Date(scan.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                {!scan.isVoided && (
                  <button
                    onClick={() => handleVoidScan(scan.id)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                  >
                    Void Scan
                  </button>
                )}
                {scan.isVoided && (
                  <span className="text-[11px] font-bold text-slate-400 line-through">
                    Voided
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CAMERA PERMISSION & ACCESS POPUP MODAL */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📷</span>
                <h3 className="font-black text-slate-900 text-base">Camera Access &amp; Permission</h3>
              </div>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* TAB SELECTOR IN MODAL */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setPermissionStep('prompt')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  permissionStep === 'prompt' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Allow Access
              </button>
              <button
                onClick={() => setPermissionStep('chrome')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  permissionStep === 'chrome' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Chrome Guide
              </button>
              <button
                onClick={() => setPermissionStep('safari')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  permissionStep === 'safari' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                iPhone Safari
              </button>
            </div>

            {/* STEP 1: PROMPT */}
            {permissionStep === 'prompt' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Your phone browser needs permission to use the camera for live barcode scanning. Tap the button below to prompt the browser dialog:
                </p>

                <div className="space-y-2">
                  <button
                    onClick={requestBrowserPermission}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>🛡️</span>
                    <span>Prompt &quot;Allow Camera&quot; Dialog</span>
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-slate-400">Or use instant fallback</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  {/* Guaranteed Snap Button */}
                  <button
                    onClick={() => {
                      setShowPermissionModal(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-black text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>📸</span>
                    <span>Take Photo to Scan (No Permission Needed)</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CHROME ON ANDROID */}
            {permissionStep === 'chrome' && (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 font-bold text-emerald-900">
                  How to enable camera in Google Chrome:
                </div>
                <ol className="space-y-2 list-decimal list-inside text-slate-600 font-medium">
                  <li>In Chrome, tap the <strong>🔒 Lock icon</strong> (or <strong>Tune ⚙️</strong>) on the left of the URL bar.</li>
                  <li>Tap <strong>&quot;Permissions&quot;</strong> or <strong>&quot;Site settings&quot;</strong>.</li>
                  <li>Find <strong>&quot;Camera&quot;</strong> and switch it from <em>Blocked</em> to <strong>&quot;Allow&quot;</strong>.</li>
                  <li>Refresh this page, then tap <strong>&quot;Live Video Scanner&quot;</strong> again.</li>
                </ol>

                <button
                  onClick={() => {
                    setShowPermissionModal(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full mt-2 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs"
                >
                  📸 Use &quot;Take Photo to Scan&quot; Instead
                </button>
              </div>
            )}

            {/* STEP 3: SAFARI ON IPHONE */}
            {permissionStep === 'safari' && (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 font-bold text-blue-900">
                  How to enable camera on iPhone (Safari):
                </div>
                <ol className="space-y-2 list-decimal list-inside text-slate-600 font-medium">
                  <li>In Safari, tap the <strong>&quot;aA&quot;</strong> icon in the bottom search bar.</li>
                  <li>Select <strong>&quot;Website Settings&quot;</strong>.</li>
                  <li>Under <strong>Camera</strong>, change the setting to <strong>&quot;Allow&quot;</strong>.</li>
                  <li>Tap <strong>Done</strong> and tap <strong>&quot;Live Video Scanner&quot;</strong> again.</li>
                </ol>

                <button
                  onClick={() => {
                    setShowPermissionModal(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full mt-2 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs"
                >
                  📸 Use &quot;Take Photo to Scan&quot; Instead
                </button>
              </div>
            )}

            {/* STEP 4: HTTP INSECURE CONTEXT NOTICE */}
            {permissionStep === 'http' && (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 font-bold text-amber-900 flex items-start gap-2">
                  <span>ℹ️</span>
                  <div>
                    <strong>Local Wi-Fi Browser Notice:</strong>
                    <div className="font-normal text-[11px] mt-0.5">
                      Modern phone browsers restrict continuous video streaming on plain HTTP (<code className="bg-amber-100 px-1 py-0.5 rounded">http://192.168.1.9:3000</code>).
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-slate-900">Recommended Solution:</div>
                  <p className="text-slate-600">
                    Use <strong>&quot;Take Photo to Scan&quot;</strong>. It launches your phone&apos;s camera directly with zero restrictions, snaps the barcode, and decodes it in milliseconds!
                  </p>
                  <button
                    onClick={() => {
                      setShowPermissionModal(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md"
                  >
                    📸 Launch Phone Camera Snap
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 border-t text-center">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Close Help
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
