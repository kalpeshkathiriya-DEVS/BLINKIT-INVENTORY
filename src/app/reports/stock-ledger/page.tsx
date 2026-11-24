'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore, StockMovement, Product } from '../../../lib/store/inventory-store';
import DateRangeFilter, { DateRangeValue, getDefaultDateRange } from '../../../components/DateRangeFilter';
import { exportToExcel } from '../../../lib/excel-export';

export default function StockLedgerReportPage() {
  const store = getInventoryStore();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange());
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [selectedReason, setSelectedReason] = useState<string>('all');

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    setProducts([...store.products]);
    setMovements([...store.stockMovements]);
  }, []);

  // Filter movements
  const filtered = movements.filter(m => {
    const time = new Date(m.createdAt).getTime();
    const inDate = time >= dateRange.from.getTime() && time <= dateRange.to.getTime();
    const matchProd = selectedProductId === 'all' || m.productId === selectedProductId;
    const matchBucket = selectedBucket === 'all' || m.bucket === selectedBucket;
    const matchReason = selectedReason === 'all' || m.reason === selectedReason;
    return inDate && matchProd && matchBucket && matchReason;
  });

  // Sort chronologically for running balance calculation
  const chronological = [...filtered].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let running = 0;
  const rowsWithBalance = chronological.map(m => {
    running += m.qty;
    const prod = products.find(p => p.id === m.productId);
    return {
      ...m,
      productName: prod?.officialName || m.productId,
      sku: prod?.sku || '',
      runningBalance: running,
    };
  });

  // Display newest first
  const displayRows = [...rowsWithBalance].reverse();

  // Stats
  const totalInflow = filtered.filter(m => m.qty > 0).reduce((s, m) => s + m.qty, 0);
  const totalOutflow = filtered.filter(m => m.qty < 0).reduce((s, m) => s + Math.abs(m.qty), 0);
  const netDelta = totalInflow - totalOutflow;

  const currentSummary = selectedProductId !== 'all'
    ? store.getStockSummary().find(s => s.productId === selectedProductId)
    : null;

  const handleExport = () => {
    const exportData = displayRows.map(r => ({
      Timestamp: new Date(r.createdAt).toLocaleString(),
      Product: r.productName,
      SKU: r.sku,
      Bucket: r.bucket,
      Quantity: r.qty,
      RunningBalance: r.runningBalance,
      Reason: r.reason,
      ReferenceDoc: r.refTable ? `${r.refTable} (${r.refId || ''})` : '—',
      User: r.userName || 'System',
    }));
    exportToExcel(exportData, `Stock_Ledger_Proof_Trail_${new Date().toISOString().split('T')[0]}`, 'Stock Ledger');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-xs text-slate-500 hover:text-emerald-600 font-bold">
            ← Reports Hub
          </Link>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>📒</span>
            <span>Stock Ledger (Immutable Proof Trail)</span>
          </h1>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
        >
          Export Excel
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Product</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
            >
              <option value="all">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.officialName} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Stock Bucket</label>
            <select
              value={selectedBucket}
              onChange={e => setSelectedBucket(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
            >
              <option value="all">All Buckets</option>
              <option value="good">Good (Available)</option>
              <option value="reserved">Reserved (PO Allocations)</option>
              <option value="in_transit">In Transit (Dispatched)</option>
              <option value="damaged">Damaged (Claims/Repairs)</option>
              <option value="return_pending">Return Pending (DNs)</option>
              <option value="written_off">Written Off (Scrap/Disposed)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Movement Reason</label>
            <select
              value={selectedReason}
              onChange={e => setSelectedReason(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
            >
              <option value="all">All Reasons</option>
              <option value="inward">Inward Purchase</option>
              <option value="reserve">PO Reservation</option>
              <option value="release">PO Release / Expiry</option>
              <option value="dispatch">PO Dispatch</option>
              <option value="grn_short">GRN Shortage</option>
              <option value="grn_reject">GRN Rejection</option>
              <option value="return_good">Return Good Stock</option>
              <option value="return_damaged">Return Damaged Stock</option>
              <option value="repaired">Damaged Repaired</option>
              <option value="returned_to_supplier">Returned to Supplier</option>
              <option value="discarded">Discarded / Scrapped</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase">Inflow (+)</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">+{totalInflow}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-rose-700 uppercase">Outflow (-)</div>
          <div className="text-2xl font-black text-rose-700 mt-1">-{totalOutflow}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Period Net Delta</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {netDelta > 0 ? `+${netDelta}` : netDelta}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-blue-700 uppercase">
            {currentSummary ? 'Available ATP' : 'Filtered Records'}
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {currentSummary ? currentSummary.available : displayRows.length}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Movement Audit Trail ({displayRows.length} transactions)
          </h2>
          <span className="text-xs text-slate-500 font-semibold">
            Strict append-only &bull; Never updated or deleted
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold sticky top-0">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Product / SKU</th>
                <th className="px-4 py-3">Bucket</th>
                <th className="px-4 py-3 text-right">Units</th>
                <th className="px-4 py-3 text-right">Running Balance</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {displayRows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-500 font-sans">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-sans">
                    <div className="font-bold text-slate-900">{row.productName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">SKU: {row.sku}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-bold uppercase text-slate-800">{row.bucket}</span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-black ${
                    row.qty > 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {row.qty > 0 ? `+${row.qty}` : row.qty}
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-slate-900 font-sans">
                    {row.runningBalance}
                  </td>
                  <td className="px-4 py-2.5 uppercase font-bold text-slate-700">{row.reason}</td>
                  <td className="px-4 py-2.5 text-slate-500 font-sans">{row.refTable || 'manual'}</td>
                  <td className="px-4 py-2.5 font-sans font-semibold text-slate-800">{row.userName || 'System'}</td>
                </tr>
              ))}
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400 font-sans">
                    No ledger movements match the current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
