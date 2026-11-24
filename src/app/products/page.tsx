'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { getInventoryStore, Product, ProductAlias, ChannelItemMap } from '../../lib/store/inventory-store';
import { code128DataUrl, code128Svg } from '../../lib/barcode';

export default function ProductsPage() {
  const store = getInventoryStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'list' | 'bulk' | 'labels'>('list');

  // Product Add/Edit Modal
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    internalName: '',
    officialName: '',
    sku: '',
    upc: '',
    hsn: '',
    mrp: 0,
    gstPercent: 18,
    unit: 'pc',
    category: 'Home & Kitchen',
    rackLocation: '',
  });

  // Selected Product for Aliases & Channels tab
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [newAlias, setNewAlias] = useState('');
  const [newChannelCode, setNewChannelCode] = useState('');

  // Bulk Upload State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  // Print Label Options
  const [labelSize, setLabelSize] = useState<'38x25' | 'a4'>('38x25');

  useEffect(() => {
    refreshProducts();
  }, []);

  const refreshProducts = () => {
    setProducts([...store.products]);
  };

  const filteredProducts = products.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.internalName.toLowerCase().includes(q) ||
      p.officialName.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.upc.toLowerCase().includes(q) ||
      store.productAliases.some(a => a.productId === p.id && a.alias.toLowerCase().includes(q)) ||
      store.channelItemMap.some(c => c.productId === p.id && c.channelItemCode.toLowerCase().includes(q));

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setProductForm({
      internalName: '',
      officialName: '',
      sku: '',
      upc: '',
      hsn: '',
      mrp: 0,
      gstPercent: 18,
      unit: 'pc',
      category: 'Home & Kitchen',
      rackLocation: '',
    });
    setModalMode('add');
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      internalName: p.internalName,
      officialName: p.officialName,
      sku: p.sku,
      upc: p.upc || '',
      hsn: p.hsn,
      mrp: p.mrp,
      gstPercent: p.gstPercent,
      unit: p.unit,
      category: p.category,
      rackLocation: p.rackLocation || '',
    });
    setModalMode('edit');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        store.createProduct({
          internalName: productForm.internalName,
          officialName: productForm.officialName,
          sku: productForm.sku,
          upc: productForm.upc || `INT-${Date.now().toString().slice(-6)}`,
          hsn: productForm.hsn,
          mrp: Number(productForm.mrp),
          gstPercent: Number(productForm.gstPercent),
          unit: productForm.unit,
          category: productForm.category,
          rackLocation: productForm.rackLocation,
        });
      } else if (modalMode === 'edit' && editingProduct) {
        store.updateProduct(editingProduct.id, {
          internalName: productForm.internalName,
          officialName: productForm.officialName,
          sku: productForm.sku,
          upc: productForm.upc,
          hsn: productForm.hsn,
          mrp: Number(productForm.mrp),
          gstPercent: Number(productForm.gstPercent),
          unit: productForm.unit,
          category: productForm.category,
          rackLocation: productForm.rackLocation,
        });
      }
      setModalMode(null);
      refreshProducts();
    } catch (err: any) {
      alert(`Error saving product: ${err.message}`);
    }
  };

  const handleToggleActive = (p: Product) => {
    store.updateProduct(p.id, { isActive: !p.isActive });
    refreshProducts();
  };

  // Add Alias
  const handleAddAlias = () => {
    if (!selectedProductDetails || !newAlias.trim()) return;
    store.addAlias(selectedProductDetails.id, newAlias.trim(), 'manual');
    setNewAlias('');
    refreshProducts();
  };

  // Add Channel Code
  const handleAddChannelCode = () => {
    if (!selectedProductDetails || !newChannelCode.trim()) return;
    store.addChannelItem({
      productId: selectedProductDetails.id,
      channel: 'blinkit',
      channelItemCode: newChannelCode.trim(),
      channelItemName: selectedProductDetails.officialName,
    });
    setNewChannelCode('');
    refreshProducts();
  };

  // Bulk Upload Handling
  const handleBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws);

      const parsed: any[] = [];
      const errors: string[] = [];

      rawRows.forEach((r, idx) => {
        const iname = r['Internal Name'] || r['internal_name'] || r['Name'];
        const oname = r['Official Name'] || r['official_name'] || iname;
        const sku = r['SKU'] || r['sku'];
        const upc = r['UPC'] || r['upc'] || '';
        const hsn = r['HSN'] || r['hsn'] || '';
        const mrp = Number(r['MRP'] || r['mrp'] || 0);
        const gst = Number(r['GST %'] || r['gst'] || 18);

        if (!iname || !sku) {
          errors.push(`Row #${idx + 2}: Missing required Internal Name or SKU.`);
        } else {
          parsed.push({
            internalName: iname,
            officialName: oname,
            sku,
            upc: String(upc),
            hsn: String(hsn),
            mrp,
            gstPercent: gst,
            unit: 'pc',
            category: r['Category'] || 'Home & Kitchen',
            rackLocation: r['Rack Location'] || '',
          });
        }
      });

      setBulkRows(parsed);
      setBulkErrors(errors);
    } catch (err: any) {
      alert(`Failed to parse Excel: ${err.message}`);
    }
  };

  const handleConfirmBulkImport = () => {
    let imported = 0;
    bulkRows.forEach(r => {
      try {
        store.createProduct(r);
        imported++;
      } catch (err: any) {
        console.warn('Skipping duplicate or invalid row:', err.message);
      }
    });
    alert(`Imported ${imported} products successfully!`);
    setBulkRows([]);
    setBulkFile(null);
    setActiveTab('list');
    refreshProducts();
  };

  const handleDownloadTemplate = () => {
    const headers = [['Internal Name', 'Official Name', 'SKU', 'UPC', 'HSN', 'MRP', 'GST %', 'Category', 'Rack Location']];
    const sample = [['Floor Wiper Big', '3-in-1 Floor Wiper with Scrubber', 'WIPER-3IN1-XL', '21713099', '96039000', 499, 18, 'Home & Kitchen', 'RACK-A1']];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'product_upload_template.xlsx');
  };

  // Print Barcode Labels
  const handlePrintLabels = () => {
    const w = window.open('', '_blank');
    if (!w) return;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Barcode Label Sheets</title>
  <style>
    ${labelSize === '38x25'
      ? '@page { size: 38mm 25mm; margin: 1mm; } body { font-family: sans-serif; margin: 0; padding: 2px; } .label { border: 1px dashed #ccc; width: 36mm; height: 23mm; page-break-after: always; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; } .title { font-size: 8px; font-weight: bold; max-width: 34mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .barcode { margin: 2px 0; } .meta { font-size: 7px; color: #444; }'
      : '@page { size: A4 portrait; margin: 10mm; } body { font-family: sans-serif; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; padding: 5mm; } .label { border: 1px solid #ddd; padding: 4px; text-align: center; border-radius: 4px; } .title { font-size: 10px; font-weight: bold; height: 24px; overflow: hidden; } .meta { font-size: 8px; color: #555; margin-top: 2px; }'
    }
  </style>
</head>
<body>
  ${filteredProducts.map(p => `
    <div class="label">
      <div class="title">${p.officialName}</div>
      <div class="barcode">${code128Svg(p.upc || p.sku, { height: labelSize === '38x25' ? 24 : 32, showText: false })}</div>
      <div class="meta font-mono"><strong>${p.upc || p.sku}</strong> | MRP ₹${p.mrp}</div>
    </div>
  `).join('')}
</body>
</html>`;

    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            📦 Product Master
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Official and internal names, UPC barcodes, SKU mapping, HSN, MRP and Blinkit channel codes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'list' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Product List
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'bulk' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Bulk Excel Upload
          </button>
          <button
            onClick={() => setActiveTab('labels')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'labels' ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Print Barcodes
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* TAB 1: PRODUCT LIST */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by internal/official name, SKU, UPC, alias..."
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500">Category:</span>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-xs font-bold"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Official Name</th>
                    <th className="px-4 py-3">Internal Name</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">UPC / Barcode</th>
                    <th className="px-4 py-3">HSN</th>
                    <th className="px-4 py-3 text-right">MRP (₹)</th>
                    <th className="px-4 py-3 text-right">GST %</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 max-w-xs">{p.officialName}</td>
                      <td className="px-4 py-3 text-slate-600">{p.internalName}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{p.sku}</td>
                      <td className="px-4 py-3 font-mono text-emerald-800 font-bold">{p.upc}</td>
                      <td className="px-4 py-3 text-slate-600">{p.hsn}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">₹{p.mrp}</td>
                      <td className="px-4 py-3 text-right">{p.gstPercent}%</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(p)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedProductDetails(p)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px]"
                        >
                          Aliases &amp; Codes
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[11px]"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BULK EXCEL UPLOAD */}
      {activeTab === 'bulk' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Bulk Product Upload via Excel</h2>
              <p className="text-xs text-slate-500">Download template, fill in items, and preview validation results before importing.</p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
            >
              📥 Download Excel Template
            </button>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center">
            <label className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer">
              {bulkFile ? bulkFile.name : 'Choose Excel Sheet (.xlsx)'}
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkFile} className="hidden" />
            </label>
          </div>

          {bulkErrors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-rose-900">Validation Errors:</div>
              {bulkErrors.map((err, idx) => (
                <div key={idx} className="text-rose-700">&bull; {err}</div>
              ))}
            </div>
          )}

          {bulkRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Preview: {bulkRows.length} valid rows</span>
                <button
                  onClick={handleConfirmBulkImport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black"
                >
                  Confirm &amp; Import Products
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 uppercase">
                    <tr>
                      <th className="px-3 py-2">Official Name</th>
                      <th className="px-3 py-2">Internal Name</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">UPC</th>
                      <th className="px-3 py-2 text-right">MRP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkRows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-bold">{r.officialName}</td>
                        <td className="px-3 py-2 text-slate-600">{r.internalName}</td>
                        <td className="px-3 py-2 font-mono">{r.sku}</td>
                        <td className="px-3 py-2 font-mono">{r.upc}</td>
                        <td className="px-3 py-2 text-right">₹{r.mrp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRINT BARCODES */}
      {activeTab === 'labels' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Print Product Barcode Labels (Code128)</h2>
              <p className="text-xs text-slate-500">Generate labels for items without pre-printed barcodes. Print in standard 38x25mm roll or A4 grid.</p>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={labelSize}
                onChange={e => setLabelSize(e.target.value as any)}
                className="p-2 border border-slate-200 rounded-lg text-xs font-bold"
              >
                <option value="38x25">Roll Label (38 x 25 mm)</option>
                <option value="a4">A4 Sheet (24 labels per page)</option>
              </select>
              <button
                onClick={handlePrintLabels}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl text-xs font-black shadow-sm"
              >
                🖨 Print All ({filteredProducts.length} items)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {filteredProducts.slice(0, 12).map(p => (
              <div key={p.id} className="border border-slate-200 rounded-xl p-3 text-center bg-slate-50">
                <div className="text-[11px] font-bold text-slate-900 truncate" title={p.officialName}>{p.officialName}</div>
                <img
                  src={code128DataUrl(p.upc || p.sku, { height: 28, showText: false })}
                  alt={p.upc}
                  className="mx-auto my-1.5"
                />
                <div className="text-[10px] font-mono text-slate-600 font-bold">{p.upc || p.sku}</div>
                <div className="text-[10px] font-bold text-emerald-700">MRP ₹{p.mrp}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Product */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveProduct} className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900">
              {modalMode === 'add' ? 'Add New Product' : 'Edit Product Master'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700">Official Name (Shown on POs &amp; Blinkit) *</label>
                <input
                  type="text"
                  required
                  value={productForm.officialName}
                  onChange={e => setProductForm({ ...productForm, officialName: e.target.value })}
                  placeholder="e.g. 3-in-1 Floor Cleaning Brush with Wiper"
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-semibold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700">Internal Name (Warehouse Staff Language) *</label>
                <input
                  type="text"
                  required
                  value={productForm.internalName}
                  onChange={e => setProductForm({ ...productForm, internalName: e.target.value })}
                  placeholder="e.g. Orange Floor Wiper"
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">SKU Code *</label>
                <input
                  type="text"
                  required
                  value={productForm.sku}
                  onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="WIPER-3IN1"
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Product UPC (Barcode)</label>
                <input
                  type="text"
                  value={productForm.upc}
                  onChange={e => setProductForm({ ...productForm, upc: e.target.value })}
                  placeholder="21713050"
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">HSN Code</label>
                <input
                  type="text"
                  value={productForm.hsn}
                  onChange={e => setProductForm({ ...productForm, hsn: e.target.value })}
                  placeholder="96039000"
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">MRP (₹)</label>
                <input
                  type="number"
                  value={productForm.mrp}
                  onChange={e => setProductForm({ ...productForm, mrp: Number(e.target.value) })}
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">GST %</label>
                <select
                  value={productForm.gstPercent}
                  onChange={e => setProductForm({ ...productForm, gstPercent: Number(e.target.value) })}
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-bold"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700">Category</label>
                <input
                  type="text"
                  value={productForm.category}
                  onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Aliases & Channel Code Linking */}
      {selectedProductDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedProductDetails.officialName}</h3>
                <div className="text-xs text-slate-500 font-mono">SKU: {selectedProductDetails.sku}</div>
              </div>
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Aliases */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 uppercase">Product Aliases</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAlias}
                  onChange={e => setNewAlias(e.target.value)}
                  placeholder="Add alternative name..."
                  className="flex-1 p-2 border border-slate-200 rounded-lg text-xs"
                />
                <button
                  onClick={handleAddAlias}
                  className="px-3 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {store.productAliases
                  .filter(a => a.productId === selectedProductDetails.id)
                  .map(a => (
                    <span key={a.id} className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold text-slate-700">
                      {a.alias}
                    </span>
                  ))}
              </div>
            </div>

            {/* Blinkit Channel Item Codes */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-xs font-black text-slate-800 uppercase">Blinkit Channel Item Codes</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChannelCode}
                  onChange={e => setNewChannelCode(e.target.value)}
                  placeholder="e.g. 10297924"
                  className="flex-1 p-2 border border-slate-200 rounded-lg font-mono text-xs"
                />
                <button
                  onClick={handleAddChannelCode}
                  className="px-3 py-2 bg-amber-400 text-amber-950 font-bold rounded-lg text-xs"
                >
                  Map Code
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {store.channelItemMap
                  .filter(c => c.productId === selectedProductDetails.id)
                  .map(c => (
                    <span key={c.id} className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-mono text-xs font-bold">
                      {c.channel}: {c.channelItemCode}
                    </span>
                  ))}
              </div>
            </div>

            <div className="text-right pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
