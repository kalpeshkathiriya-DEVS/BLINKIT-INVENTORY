'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  parseBlinkitRoExcel,
  parseBlinkitRoPdfText,
  validateBlinkitRo,
  deriveSupplyType,
  BlinkitRoItem,
  BlinkitRoFooter,
  BlinkitRoHeader,
  BlinkitRoValidationResult,
} from '../../lib/blinkit/ro-parser';
import { getInventoryStore, Product } from '../../lib/store/inventory-store';

export default function RoImportPage() {
  const router = useRouter();
  const store = getInventoryStore();

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTextContent, setPdfTextContent] = useState<string>('');
  
  const [header, setHeader] = useState<BlinkitRoHeader>({
    roNumber: '',
    roDate: new Date().toISOString().split('T')[0],
    validTill: '',
    roType: 'Seller Hub STO',
    sellerNo: 'SEL-98421',
    sellerGstin: '24AAACA9876Q1Z5',
    sellerAddress: 'Plot 42, GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat - 382445',
    deliveryLocation: 'BCPL - Kundli Feeder Warehouse',
    deliveryAddress: 'Plot No. 182-184, Phase 4, Sector 57, HSIIDC Industrial Area, Kundli, Sonipat, Haryana - 131028',
    buyerGstin: '06AABCB4321P1ZT',
    spocName: 'Amit Sharma',
    spocPhone: '+91 98765 43210',
    supplyType: 'inter_state',
  });

  const [items, setItems] = useState<BlinkitRoItem[]>([]);
  const [footer, setFooter] = useState<BlinkitRoFooter>({});
  const [validation, setValidation] = useState<BlinkitRoValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal for linking unmapped items
  const [mappingModalItem, setMappingModalItem] = useState<BlinkitRoItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Handle Excel Upload
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setIsProcessing(true);
    setNotification(null);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseBlinkitRoExcel(buffer);

      // Check product mappings against product master & channel_item_map
      const mappedItems = parsed.items.map(item => {
        const match = store.findProductMapping(item.itemCode, item.upc);
        return {
          ...item,
          productId: match.product?.id,
          isMapped: Boolean(match.product),
          mappedSku: match.product?.sku,
        };
      });

      setItems(mappedItems);
      setFooter(parsed.footer);

      // If R.O. number not set, pre-fill from filename
      let roNum = header.roNumber;
      if (!roNum) {
        const fnMatch = file.name.match(/([0-9]{10,20})/);
        if (fnMatch) {
          roNum = fnMatch[1];
          setHeader(prev => ({ ...prev, roNumber: roNum }));
        }
      }

      // Run validation
      const existingRos = store.purchaseOrders.map(p => p.poNumber);
      const val = validateBlinkitRo(
        { ...header, roNumber: roNum },
        mappedItems,
        parsed.footer,
        existingRos
      );
      setValidation(val);
    } catch (err: any) {
      setNotification({ type: 'error', message: `Excel parsing failed: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle PDF or TXT upload for header extraction
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFile(file);
    try {
      const text = await file.text();
      setPdfTextContent(text);
      const extractedHeader = parseBlinkitRoPdfText(text, file.name);

      setHeader(prev => ({
        ...prev,
        roNumber: extractedHeader.roNumber || prev.roNumber,
        roDate: extractedHeader.roDate || prev.roDate,
        validTill: extractedHeader.validTill || prev.validTill,
        roType: extractedHeader.roType || prev.roType,
        sellerNo: extractedHeader.sellerNo || prev.sellerNo,
        sellerGstin: extractedHeader.sellerGstin || prev.sellerGstin,
        buyerGstin: extractedHeader.buyerGstin || prev.buyerGstin,
        deliveryLocation: extractedHeader.deliveryLocation || prev.deliveryLocation,
        deliveryAddress: extractedHeader.deliveryAddress || prev.deliveryAddress,
        spocName: extractedHeader.spocName || prev.spocName,
        spocPhone: extractedHeader.spocPhone || prev.spocPhone,
        supplyType: extractedHeader.supplyType || deriveSupplyType(extractedHeader.buyerGstin, extractedHeader.sellerGstin),
      }));

      // Re-validate with new header
      if (items.length > 0) {
        const existingRos = store.purchaseOrders.map(p => p.poNumber);
        const val = validateBlinkitRo(extractedHeader, items, footer, existingRos);
        setValidation(val);
      }
    } catch (err: any) {
      console.warn('PDF read fallback:', err);
    }
  };

  // Load Fixture 1: Real Blinkit RO Sample (18 items, 1172 units, Rs 4,15,588)
  const loadSampleFixture = async (type: 'inter' | 'intra') => {
    setIsProcessing(true);
    setNotification(null);

    try {
      const sampleFileName = type === 'inter' ? 'RO_2011710136067.xlsx' : 'RO_2011710136068_intra_state.xlsx';
      const samplePdfText = `RECOMMENDED QUANTITY ORDER (R.O.)
Seller Hub STO
R.O. Number: ${type === 'inter' ? '2011710136067' : '2011710136068'}
R.O. Date: 12-Nov-2026
R.O. Expiry Date: 22-Nov-2026
R.O. Type: Seller Hub STO
Seller No.: SEL-98421
Seller Name: Apex Home Essentials Pvt Ltd
Seller GSTIN: ${type === 'inter' ? '24AAACA9876Q1Z5' : '06AAACA9876Q1Z5'}
Delivered To: BCPL - Kundli Feeder Warehouse
Blinkit GSTIN: 06AABCB4321P1ZT
SPOC Name: Amit Sharma
SPOC Phone: +91 98765 43210
Total Items: 18
Total Quantity: 1172
Total Net Amount: 415588.00`;

      // Read sample file from public or fetch
      const res = await fetch(`/samples/${sampleFileName}`);
      let buffer: ArrayBuffer;
      if (res.ok) {
        buffer = await res.arrayBuffer();
      } else {
        // Fallback: load using generated sample items
        // We can trigger an API or read directly
        throw new Error(`Please drop the sample file from the /samples directory into the upload box below.`);
      }

      const parsed = parseBlinkitRoExcel(buffer);
      const mappedItems = parsed.items.map(item => {
        const match = store.findProductMapping(item.itemCode, item.upc);
        return {
          ...item,
          productId: match.product?.id,
          isMapped: Boolean(match.product),
          mappedSku: match.product?.sku,
        };
      });

      const extractedHeader = parseBlinkitRoPdfText(samplePdfText, sampleFileName);
      setHeader(extractedHeader);
      setItems(mappedItems);
      setFooter(parsed.footer);

      const existingRos = store.purchaseOrders.map(p => p.poNumber);
      const val = validateBlinkitRo(extractedHeader, mappedItems, parsed.footer, existingRos);
      setValidation(val);
      setNotification({
        type: 'success',
        message: `Loaded ${type === 'inter' ? 'Gujarat-to-Haryana (IGST)' : 'Haryana-to-Haryana (CGST+SGST)'} test fixture successfully!`,
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Link Unmapped Product
  const handleLinkProduct = () => {
    if (!mappingModalItem || !selectedProductId) return;

    store.mapChannelItem(mappingModalItem.itemCode, selectedProductId, mappingModalItem.description);
    const prod = store.products.find(p => p.id === selectedProductId);

    // Update items state
    setItems(prev => prev.map(it => {
      if (it.itemCode === mappingModalItem.itemCode) {
        return {
          ...it,
          productId: selectedProductId,
          isMapped: true,
          mappedSku: prod?.sku,
        };
      }
      return it;
    }));

    // Revalidate
    setMappingModalItem(null);
    setSelectedProductId('');
    const updatedItems = items.map(it => it.itemCode === mappingModalItem.itemCode ? { ...it, isMapped: true } : it);
    const existingRos = store.purchaseOrders.map(p => p.poNumber);
    setValidation(validateBlinkitRo(header, updatedItems, footer, existingRos));
  };

  // Quick Create Product & Map
  const handleQuickCreateAndMap = () => {
    if (!mappingModalItem) return;

    const newProd = store.createProductAndMap({
      internalName: mappingModalItem.description,
      officialName: mappingModalItem.description,
      sku: `SKU-${mappingModalItem.itemCode}`,
      upc: mappingModalItem.upc,
      hsn: mappingModalItem.hsn,
      mrp: mappingModalItem.mrp,
      gstPercent: mappingModalItem.igstPct || (mappingModalItem.cgstPct + mappingModalItem.sgstPct),
      channelItemCode: mappingModalItem.itemCode,
    });

    setItems(prev => prev.map(it => {
      if (it.itemCode === mappingModalItem.itemCode) {
        return {
          ...it,
          productId: newProd.id,
          isMapped: true,
          mappedSku: newProd.sku,
        };
      }
      return it;
    }));

    setMappingModalItem(null);
    const updatedItems = items.map(it => it.itemCode === mappingModalItem.itemCode ? { ...it, isMapped: true } : it);
    const existingRos = store.purchaseOrders.map(p => p.poNumber);
    setValidation(validateBlinkitRo(header, updatedItems, footer, existingRos));
  };

  // Confirm & Save PO
  const handleSavePo = () => {
    if (!header.roNumber) {
      alert('Please specify the R.O. Number.');
      return;
    }
    if (items.length === 0) {
      alert('No line items to import.');
      return;
    }

    try {
      const po = store.importBlinkitRo({
        header,
        items,
        sourceFiles: {
          excelFileName: excelFile?.name,
          pdfFileName: pdfFile?.name,
        },
      });

      alert(`R.O. #${po.poNumber} imported successfully!\nStatus: ${po.status.toUpperCase()}\nReserved Units: ${po.items.reduce((s, i) => s + i.reservedQty, 0)}/${po.totalQty}`);
      router.push(`/pos/${po.id}`);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Fixture Quick Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 uppercase">
              Blinkit Seller Hub
            </span>
            <span className="text-xs text-slate-500 font-medium">Spec 05a Compliant</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Blinkit R.O. Importer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload Excel (line items) and PDF (order header) together. Missing PDF will never block upload.
          </p>
        </div>

        {/* Fixture Test Buttons */}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-500 text-amber-950 cursor-pointer shadow-sm transition-all">
            📁 Select Local Excel (.xlsx)
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
          </label>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-sm font-semibold border ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Dual Upload Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Excel */}
        <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
          excelFile ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-300 bg-white hover:border-amber-400'
        }`}>
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl font-bold">
            📊
          </div>
          <h3 className="font-bold text-slate-900 mt-3 text-base">
            1. Excel Sheet (.xlsx)
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Contains line items, item code, UPC, quantities, MRP, landing rate, tax breakup & footer.
          </p>
          <div className="mt-4">
            <label className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-sm transition-all">
              {excelFile ? `Replace: ${excelFile.name}` : 'Choose Excel File'}
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
            </label>
          </div>
          {excelFile && (
            <div className="mt-2 text-[11px] text-emerald-700 font-semibold">
              ✓ Loaded: {items.length} items &bull; Total: {items.reduce((s, i) => s + i.quantity, 0)} units
            </div>
          )}
        </div>

        {/* Box 2: PDF */}
        <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
          pdfFile ? 'border-blue-500 bg-blue-50/40' : 'border-slate-300 bg-white hover:border-blue-400'
        }`}>
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto text-xl font-bold">
            📄
          </div>
          <h3 className="font-bold text-slate-900 mt-3 text-base">
            2. PDF / Text Header (Optional)
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Auto-extracts R.O. Number, Expiry, Warehouse & SPOC. If missing, editable form is provided below.
          </p>
          <div className="mt-4">
            <label className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer shadow-sm transition-all">
              {pdfFile ? `Replace: ${pdfFile.name}` : 'Choose PDF / Text File'}
              <input type="file" accept=".pdf,.txt" onChange={handlePdfUpload} className="hidden" />
            </label>
          </div>
          {pdfFile ? (
            <div className="mt-2 text-[11px] text-blue-700 font-semibold">
              ✓ Header extracted from {pdfFile.name}
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-slate-400">
              (Never blocks upload: you can edit header manually)
            </div>
          )}
        </div>
      </div>

      {/* Header Fields Preview & Edit Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            R.O. Header Details (Blinkit Seller Hub)
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase">
            Supply: {header.supplyType === 'inter_state' ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700">R.O. Number *</label>
            <input
              type="text"
              value={header.roNumber}
              onChange={e => setHeader({ ...header, roNumber: e.target.value })}
              placeholder="e.g. 2011710136067"
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 bg-slate-50"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">R.O. Date</label>
            <input
              type="date"
              value={header.roDate}
              onChange={e => setHeader({ ...header, roDate: e.target.value })}
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">Expiry Date (Valid Till)</label>
            <input
              type="date"
              value={header.validTill}
              onChange={e => setHeader({ ...header, validTill: e.target.value })}
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">R.O. Type</label>
            <input
              type="text"
              value={header.roType}
              onChange={e => setHeader({ ...header, roType: e.target.value })}
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-bold text-slate-700">Delivery Warehouse Name</label>
            <input
              type="text"
              value={header.deliveryLocation}
              onChange={e => setHeader({ ...header, deliveryLocation: e.target.value })}
              placeholder="e.g. BCPL - Kundli Feeder Warehouse"
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-900"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">Blinkit GSTIN</label>
            <input
              type="text"
              value={header.buyerGstin}
              onChange={e => {
                const bGst = e.target.value;
                setHeader({
                  ...header,
                  buyerGstin: bGst,
                  supplyType: deriveSupplyType(bGst, header.sellerGstin),
                });
              }}
              placeholder="06AABCB4321P1ZT"
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">Seller GSTIN</label>
            <input
              type="text"
              value={header.sellerGstin}
              onChange={e => {
                const sGst = e.target.value;
                setHeader({
                  ...header,
                  sellerGstin: sGst,
                  supplyType: deriveSupplyType(header.buyerGstin, sGst),
                });
              }}
              placeholder="24AAACA9876Q1Z5"
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Validation Summary Banners */}
      {validation && (
        <div className={`p-5 rounded-2xl border ${
          validation.isValid
            ? 'bg-emerald-50/80 border-emerald-200'
            : 'bg-rose-50/80 border-rose-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${validation.isValid ? 'bg-emerald-600' : 'bg-rose-600'}`} />
              <h3 className={`font-black text-sm uppercase tracking-wide ${validation.isValid ? 'text-emerald-900' : 'text-rose-900'}`}>
                {validation.isValid ? '✓ Validation Passed: Ready to Import' : '⚠ Validation Issues Found'}
              </h3>
            </div>
            <div className="text-xs font-bold text-slate-700 space-x-3">
              <span>Items: <strong>{validation.lineItemsCount}</strong></span>
              <span>Units: <strong>{validation.totalUnits}</strong></span>
              <span>Total: <strong>₹{Math.round(validation.totalNetAmount).toLocaleString('en-IN')}</strong></span>
            </div>
          </div>

          {validation.errors.length > 0 && (
            <div className="space-y-1 mb-2">
              {validation.errors.map((err, idx) => (
                <div key={idx} className="text-xs font-semibold text-rose-800 flex items-start space-x-1.5">
                  <span>&bull;</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="space-y-1">
              {validation.warnings.map((warn, idx) => (
                <div key={idx} className="text-xs font-semibold text-amber-800 flex items-start space-x-1.5">
                  <span>⚠</span>
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Line Items Table */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Parsed Line Items ({items.length} items &bull; {items.reduce((s, i) => s + i.quantity, 0)} units)
              </h2>
              <p className="text-xs text-slate-500">
                Values parsed matching header names. Item Code, HSN, and UPC stored as string text.
              </p>
            </div>

            {/* Confirm & Import Button */}
            <button
              onClick={handleSavePo}
              disabled={!validation?.isValid || items.length === 0}
              className={`px-6 py-2.5 rounded-xl font-black text-sm shadow-sm transition-all ${
                validation?.isValid
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              Confirm & Save R.O.
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Item Code</th>
                  <th className="px-4 py-3">Product UPC</th>
                  <th className="px-4 py-3">Product Description</th>
                  <th className="px-4 py-3">HSN</th>
                  <th className="px-4 py-3 text-right">Tax (%)</th>
                  <th className="px-4 py-3 text-right">Landing Rate</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">MRP</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-center">Mapping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => (
                  <tr
                    key={it.line}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !it.isValid ? 'bg-rose-50/60' : !it.isMapped ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 font-bold text-slate-700">{it.line}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{it.itemCode}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{it.upc}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 max-w-xs truncate" title={it.description}>
                      {it.description}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{it.hsn}</td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {it.igstPct > 0 ? `IGST ${it.igstPct}%` : `C+S ${it.cgstPct + it.sgstPct}%`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">₹{it.landingRate.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-black text-slate-900">{it.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">₹{it.mrp.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-black text-slate-900">
                      ₹{it.totalAmount.toFixed(2)}
                      {!it.isValid && (
                        <div className="text-[10px] text-rose-600 font-bold">
                          ≠ {it.quantity} x {it.landingRate}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {it.isMapped ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          Mapped ({it.mappedSku})
                        </span>
                      ) : (
                        <button
                          onClick={() => setMappingModalItem(it)}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 cursor-pointer"
                        >
                          Unmapped (Link)
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unmapped Product Resolution Modal */}
      {mappingModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900">
              Link Blinkit Item to Master
            </h3>
            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <div><strong>Blinkit Item Code:</strong> {mappingModalItem.itemCode}</div>
              <div><strong>UPC:</strong> {mappingModalItem.upc}</div>
              <div><strong>Name:</strong> {mappingModalItem.description}</div>
              <div><strong>MRP:</strong> ₹{mappingModalItem.mrp} &bull; <strong>HSN:</strong> {mappingModalItem.hsn}</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Option 1: Link to Existing Product</label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="mt-1 w-full p-2 border border-slate-200 rounded-lg text-xs"
              >
                <option value="">-- Choose Product --</option>
                {store.products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.internalName} (UPC: {p.upc || 'None'})
                  </option>
                ))}
              </select>
              <button
                onClick={handleLinkProduct}
                disabled={!selectedProductId}
                className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs"
              >
                Save Mapping
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <label className="text-xs font-bold text-slate-700">Option 2: Quick Create New Product</label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically creates product with Blinkit name, HSN, UPC & MRP and maps it permanently.
              </p>
              <button
                onClick={handleQuickCreateAndMap}
                className="mt-2 w-full py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-lg text-xs"
              >
                Create Product &amp; Link
              </button>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setMappingModalItem(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
