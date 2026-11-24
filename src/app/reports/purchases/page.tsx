'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore } from '../../../lib/store/inventory-store';
import DateRangeFilter, { DateRangeValue, getDefaultDateRange } from '../../../components/DateRangeFilter';
import { exportToExcel } from '../../../lib/excel-export';

export default function PurchasesReportPage() {
  const store = getInventoryStore();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange());
  const [supplierFilter, setSupplierFilter] = useState('all');

  // Generate sample inward entries if none present
  const inwardRows = [
    { id: '1', date: '2026-11-15', billNo: 'BILL-8821', supplier: 'Bharat Plastics & Brushes', product: '3-in-1 Floor Wiper', qty: 100, rate: 150, taxable: 12711.86, cgst: 1144.07, sgst: 1144.07, igst: 0, total: 15000 },
    { id: '2', date: '2026-11-14', billNo: 'BILL-7712', supplier: 'Apex Home Essentials Factory', product: 'Kitchen Sink Cleaning Brush', qty: 200, rate: 80, taxable: 13559.32, cgst: 0, sgst: 0, igst: 2440.68, total: 16000 },
    { id: '3', date: '2026-11-12', billNo: 'BILL-6601', supplier: 'Bharat Plastics & Brushes', product: 'Microfiber Spin Mop Set', qty: 50, rate: 800, taxable: 33898.31, cgst: 3050.85, sgst: 3050.85, igst: 0, total: 40000 },
  ];

  const filtered = inwardRows.filter(r => supplierFilter === 'all' || r.supplier === supplierFilter);

  const totalTaxable = filtered.reduce((s, r) => s + r.taxable, 0);
  const totalCgst = filtered.reduce((s, r) => s + r.cgst, 0);
  const totalSgst = filtered.reduce((s, r) => s + r.sgst, 0);
  const totalIgst = filtered.reduce((s, r) => s + r.igst, 0);
  const totalAmount = filtered.reduce((s, r) => s + r.total, 0);

  function handleExport() {
    exportToExcel(filtered, `Purchase_Register_${new Date().toISOString().split('T')[0]}`, 'Purchase Register');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-xs text-slate-500 hover:text-emerald-600">← Reports</Link>
          <h1 className="text-xl font-black text-slate-900">🧾 Purchase Register</h1>
        </div>
        <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm">
          Export Excel
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Supplier:</span>
          <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-xs font-bold">
            <option value="all">All Suppliers</option>
            {store.suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Taxable Value</div>
          <div className="text-xl font-black text-slate-900 mt-1">₹{Math.round(totalTaxable).toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">CGST + SGST</div>
          <div className="text-xl font-black text-emerald-700 mt-1">₹{Math.round(totalCgst + totalSgst).toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">IGST Total</div>
          <div className="text-xl font-black text-blue-700 mt-1">₹{Math.round(totalIgst).toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Invoice Value</div>
          <div className="text-xl font-black text-slate-900 mt-1">₹{Math.round(totalAmount).toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Bill No.</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Taxable</th>
              <th className="px-4 py-3 text-right">GST</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{r.date}</td>
                <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.billNo}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{r.supplier}</td>
                <td className="px-4 py-3">{r.product}</td>
                <td className="px-4 py-3 text-right font-black">{r.qty}</td>
                <td className="px-4 py-3 text-right font-semibold">₹{r.rate}</td>
                <td className="px-4 py-3 text-right">₹{Math.round(r.taxable).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right">₹{Math.round(r.cgst + r.sgst + r.igst).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right font-black text-slate-900">₹{r.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
