'use client';

import React, { useState, useEffect } from 'react';
import { getInventoryStore, StockSummaryItem } from '../../../lib/store/inventory-store';
import DateRangeFilter, { DateRangeValue, getDefaultDateRange } from '../../../components/DateRangeFilter';
import { exportToExcel } from '../../../lib/excel-export';
import Link from 'next/link';

export default function StockReportPage() {
  const store = getInventoryStore();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange());
  const [data, setData] = useState<StockSummaryItem[]>([]);

  useEffect(() => {
    setData(store.getStockSummary());
  }, []);

  // Last purchase rate: use MRP as proxy (store doesn't have inward entries separately)
  function getLastRate(item: StockSummaryItem): number {
    const prod = store.products.find(p => p.id === item.productId);
    return prod?.mrp || 0;
  }

  const rows = data.map(item => ({
    ...item,
    lastRate: getLastRate(item),
    valuation: item.good * getLastRate(item),
  }));

  const totalGood = rows.reduce((s, r) => s + r.good, 0);
  const totalValuation = rows.reduce((s, r) => s + r.valuation, 0);

  function handleExport() {
    const exportData = rows.map(r => ({
      'Product (Internal)': r.internalName,
      'Official Name': r.officialName,
      'SKU': r.sku,
      'Good': r.good,
      'Reserved': r.reserved,
      'Available': r.available,
      'Damaged': r.damaged,
      'In Transit': r.inTransit,
      'Return Pending': r.returnPending,
      'Last Purchase Rate (₹)': r.lastRate,
      'Valuation (₹)': r.valuation,
    }));
    exportToExcel(exportData, `Stock_Report_${new Date().toISOString().split('T')[0]}`, 'Stock Report');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-xs text-slate-500 hover:text-emerald-600">← Reports</Link>
        <h1 className="text-xl font-black text-slate-900">📦 Stock Report</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total SKUs</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{rows.length}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total Good Units</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{totalGood.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Valuation</div>
          <div className="text-2xl font-black text-blue-800 mt-1">₹{totalValuation.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all"
        >
          ⬇ Export Excel
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Internal Name</th>
                <th className="px-4 py-3 text-right">Good</th>
                <th className="px-4 py-3 text-right">Reserved</th>
                <th className="px-4 py-3 text-right">Available</th>
                <th className="px-4 py-3 text-right">Damaged</th>
                <th className="px-4 py-3 text-right">In Transit</th>
                <th className="px-4 py-3 text-right">Ret. Pending</th>
                <th className="px-4 py-3 text-right">Rate (₹)</th>
                <th className="px-4 py-3 text-right">Valuation (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.productId} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.officialName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.internalName}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">{r.good}</td>
                  <td className="px-4 py-3 text-right font-mono text-amber-700">{r.reserved}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{r.available}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">{r.damaged}</td>
                  <td className="px-4 py-3 text-right font-mono text-blue-700">{r.inTransit}</td>
                  <td className="px-4 py-3 text-right font-mono text-purple-700">{r.returnPending}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">₹{r.lastRate.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{r.valuation.toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-slate-100 font-bold text-slate-900">
                <td className="px-4 py-3" colSpan={2}>TOTAL</td>
                <td className="px-4 py-3 text-right font-mono">{rows.reduce((s, r) => s + r.good, 0)}</td>
                <td className="px-4 py-3 text-right font-mono">{rows.reduce((s, r) => s + r.reserved, 0)}</td>
                <td className="px-4 py-3 text-right font-mono">{rows.reduce((s, r) => s + r.available, 0)}</td>
                <td className="px-4 py-3 text-right font-mono">{rows.reduce((s, r) => s + r.damaged, 0)}</td>
                <td className="px-4 py-3 text-right font-mono">{rows.reduce((s, r) => s + r.inTransit, 0)}</td>
                <td className="px-4 py-3 text-right font-mono">{rows.reduce((s, r) => s + r.returnPending, 0)}</td>
                <td className="px-4 py-3 text-right"></td>
                <td className="px-4 py-3 text-right font-mono">₹{totalValuation.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
