'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getInventoryStore, PurchaseOrder } from '../../../lib/store/inventory-store';
import { calculateCartonsPerLine, generateCartonLabelsHtml, generateGstInvoiceHtml } from '../../../lib/blinkit/dispatch-invoice';

export default function PoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poId = params.id as string;
  const store = getInventoryStore();

  const [po, setPo] = useState<PurchaseOrder | null>(null);

  // Modals
  const [showCartonModal, setShowCartonModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  // Dispatch Form State
  const [invoiceNo, setInvoiceNo] = useState(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNo, setVehicleNo] = useState('HR-26-DA-4412');
  const [transporter, setTransporter] = useState('Delhivery Surface');
  const [lrNo, setLrNo] = useState('LR-889922');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('11:00 AM');
  const [shortfallReason, setShortfallReason] = useState('');

  useEffect(() => {
    const found = store.purchaseOrders.find(p => p.id === poId);
    if (found) setPo(found);
  }, [poId]);

  if (!po) {
    return (
      <div className="p-12 text-center text-slate-500">
        Order not found.{' '}
        <Link href="/pos" className="text-emerald-700 font-bold">
          Back to orders
        </Link>
      </div>
    );
  }

  // Pre-dispatch check: verify UPC & MRP in master vs PO
  const preDispatchWarnings: string[] = [];
  po.items.forEach(item => {
    if (!item.blinkitUpc) {
      preDispatchWarnings.push(`Line #${item.channelItemCode} (${item.itemName}) has missing UPC.`);
    }
    const prod = item.productId ? store.products.find(p => p.id === item.productId) : undefined;
    if (prod && prod.mrp !== item.mrp) {
      preDispatchWarnings.push(`Line #${item.channelItemCode}: PO MRP (₹${item.mrp}) differs from Product Master MRP (₹${prod.mrp}).`);
    }
  });

  const totalScanned = po.items.reduce((s, i) => s + i.scannedQty, 0);
  const hasShortfall = totalScanned < po.totalQty;

  // Generate Carton labels list (25 units per carton default)
  const cartonsList: any[] = [];
  po.items.forEach(item => {
    const qty = item.scannedQty > 0 ? item.scannedQty : item.requestedQty;
    const { cartons, unitsPerCarton } = calculateCartonsPerLine(qty, 25);
    for (let c = 1; c <= cartons; c++) {
      const isLast = c === cartons;
      const countInThisBox = isLast && qty % unitsPerCarton !== 0 ? qty % unitsPerCarton : unitsPerCarton;
      cartonsList.push({
        roNumber: po.poNumber,
        upc: item.blinkitUpc,
        itemCode: item.channelItemCode,
        description: item.itemName,
        cartonIndex: c,
        totalCartonsForProduct: cartons,
        qtyInCarton: countInThisBox,
        destinationWarehouse: po.deliveryLocation,
      });
    }
  });

  // Handle Reserve Action
  const handleReserve = () => {
    try {
      const res = store.reservePo(po.id);
      setPo({ ...po });
      alert(`Reserved stock. Shortfall: ${res.totalShortfall} units.`);
    } catch (err: any) {
      alert(`Reservation error: ${err.message}`);
    }
  };

  // Handle Release Action
  const handleRelease = () => {
    if (!confirm('Are you sure you want to release all reserved stock?')) return;
    try {
      store.releasePo(po.id, 'Admin manual release');
      setPo({ ...po });
      alert('Reserved stock released back to available ledger.');
    } catch (err: any) {
      alert(`Release error: ${err.message}`);
    }
  };

  // Handle Close Dispatch
  const handleConfirmDispatch = () => {
    try {
      store.closeDispatch({
        poId: po.id,
        invoiceNo,
        invoiceDate,
        cartons: cartonsList.length,
        vehicleNo,
        transporter,
        lrNo,
        appointmentDate,
        appointmentTime,
        shortfallReason,
      });
      setShowDispatchModal(false);
      setPo({ ...po });
      alert('Dispatch completed! Stock moved to In-Transit bucket.');
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    }
  };

  // Print Window Helpers
  const openPrintWindow = (html: string) => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Details Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Link href="/pos" className="text-xs text-slate-500 hover:text-slate-800 font-bold">
                &larr; Back to Orders
              </Link>
              <span className="text-slate-300">&bull;</span>
              <span className="text-xs font-mono font-bold text-slate-500">
                Channel: Blinkit
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              R.O. #{po.poNumber}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Type: {po.roType} &bull; Date: {po.poDate} &bull; Expiry: {po.validTill || 'N/A'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/scan"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm"
            >
              📱 Team Scan Screen
            </Link>
            <button
              onClick={() => openPrintWindow(generateCartonLabelsHtml(cartonsList))}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl text-xs font-black shadow-sm"
            >
              🏷 Print Carton Labels ({cartonsList.length})
            </button>
            <button
              onClick={() => {
                const totalTaxable = po.items.reduce((s, i) => s + (i.lineTotal / (1 + (i.igstPct || i.cgstPct*2)/100)), 0);
                const totalTax = po.netAmount - totalTaxable;
                const invHtml = generateGstInvoiceHtml({
                  invoiceNo,
                  invoiceDate,
                  roNumber: po.poNumber,
                  roDate: po.poDate,
                  cartonsCount: cartonsList.length,
                  seller: {
                    name: 'Apex Home Essentials Pvt Ltd',
                    address: 'Plot 42, GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat',
                    gstin: po.sellerGstin,
                    state: 'Gujarat',
                    stateCode: '24',
                  },
                  buyer: {
                    warehouseName: po.deliveryLocation,
                    address: 'HSIIDC Industrial Area, Kundli, Sonipat, Haryana',
                    gstin: po.buyerGstin,
                    state: 'Haryana',
                    stateCode: '06',
                    spocName: po.spocName,
                    spocPhone: po.spocPhone,
                  },
                  items: po.items.map((it, idx) => ({
                    srNo: idx + 1,
                    itemCode: it.channelItemCode,
                    upc: it.blinkitUpc,
                    hsn: it.hsn,
                    description: it.itemName,
                    qty: it.scannedQty > 0 ? it.scannedQty : it.requestedQty,
                    mrp: it.mrp,
                    landingRate: it.landingRate,
                    taxableValue: Number((it.lineTotal / (1 + (it.igstPct || it.cgstPct*2)/100)).toFixed(2)),
                    cgstPct: it.cgstPct,
                    cgstAmount: 0,
                    sgstPct: it.sgstPct,
                    sgstAmount: 0,
                    igstPct: it.igstPct,
                    igstAmount: Number((it.lineTotal - (it.lineTotal / (1 + it.igstPct/100))).toFixed(2)),
                    totalAmount: it.lineTotal,
                  })),
                  totalTaxable,
                  totalCgst: 0,
                  totalSgst: 0,
                  totalIgst: totalTax,
                  totalAmount: po.netAmount,
                });
                openPrintWindow(invHtml);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              📄 Print GST Invoice
            </button>
            <button
              onClick={() => setShowDispatchModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm"
            >
              🚚 Close Dispatch
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl text-xs">
          <div>
            <span className="text-slate-500 font-semibold">Blinkit Warehouse</span>
            <div className="font-bold text-slate-900 mt-0.5">{po.deliveryLocation}</div>
            <div className="text-slate-500">GST: {po.buyerGstin}</div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Warehouse SPOC</span>
            <div className="font-bold text-slate-900 mt-0.5">{po.spocName || 'Amit Sharma'}</div>
            <div className="text-slate-500">{po.spocPhone || '+91 98765 43210'}</div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Reservation & Stock</span>
            <div className="font-bold text-slate-900 mt-0.5">
              Reserved: {po.items.reduce((s, i) => s + i.reservedQty, 0)} / {po.totalQty} units
            </div>
            <div className="space-x-2 mt-1">
              <button onClick={handleReserve} className="text-emerald-700 font-bold hover:underline">Reserve</button>
              <button onClick={handleRelease} className="text-rose-600 font-bold hover:underline">Release</button>
            </div>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Dispatch Appointment</span>
            <div className="font-bold text-slate-900 mt-0.5">
              {appointmentDate ? `${appointmentDate} @ ${appointmentTime}` : 'Not Booked Yet'}
            </div>
            <div className="text-slate-500">Blinkit Seller Hub Slot</div>
          </div>
        </div>

        {/* Pre-Dispatch Warnings (Rule 2) */}
        {preDispatchWarnings.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-amber-900">Pre-Dispatch Inspection Warnings:</div>
            {preDispatchWarnings.map((w, idx) => (
              <div key={idx} className="text-amber-800">&bull; {w}</div>
            ))}
          </div>
        )}
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Order Items ({po.items.length} lines &bull; {po.totalQty} units)
          </h2>
          <span className="text-xs font-bold text-slate-700">
            Total Net: ₹{Math.round(po.netAmount).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3">Product UPC</th>
                <th className="px-4 py-3">Item Description</th>
                <th className="px-4 py-3 text-right">Requested</th>
                <th className="px-4 py-3 text-right">Reserved</th>
                <th className="px-4 py-3 text-right">Scanned</th>
                <th className="px-4 py-3 text-right">Rate (₹)</th>
                <th className="px-4 py-3 text-right">Total (₹)</th>
                <th className="px-4 py-3 text-center">Cartons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {po.items.map(item => {
                const cInfo = calculateCartonsPerLine(item.scannedQty || item.requestedQty, 25);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.channelItemCode}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">{item.blinkitUpc}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-xs">{item.itemName}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{item.requestedQty}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{item.reservedQty}</td>
                    <td className="px-4 py-3 text-right font-black text-blue-700">{item.scannedQty}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{item.landingRate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold">₹{item.lineTotal.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {cInfo.cartons} box
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Close Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900">
              Close Dispatch & Generate Transfer
            </h3>
            <p className="text-xs text-slate-500">
              Moves stock from Good/Reserved to In-Transit bucket and prepares handover manifest.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">GST Invoice No. *</label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Vehicle No.</label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={e => setVehicleNo(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Transporter / LR No.</label>
                <input
                  type="text"
                  value={transporter}
                  onChange={e => setTransporter(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Appointment Date</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={e => setAppointmentDate(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Appointment Time</label>
                <input
                  type="text"
                  value={appointmentTime}
                  onChange={e => setAppointmentTime(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {hasShortfall && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <div className="text-xs font-bold text-rose-900">
                  ⚠ Shortfall Detected: Scanned {totalScanned} of {po.totalQty} units
                </div>
                <label className="text-[11px] font-bold text-slate-700">Shortfall Reason (Required):</label>
                <input
                  type="text"
                  value={shortfallReason}
                  onChange={e => setShortfallReason(e.target.value)}
                  placeholder="e.g. Stock shortage in warehouse, partial dispatch approved"
                  className="w-full p-2 border border-rose-300 rounded-lg text-xs"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispatch}
                disabled={hasShortfall && !shortfallReason.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
