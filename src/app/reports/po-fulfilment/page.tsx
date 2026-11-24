'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore, PurchaseOrder } from '../../../lib/store/inventory-store';
import DateRangeFilter, { DateRangeValue, getDefaultDateRange } from '../../../components/DateRangeFilter';
import { exportToExcel } from '../../../lib/excel-export';

export default function PoFulfilmentReportPage() {
  const store = getInventoryStore();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange());
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    setOrders([...store.purchaseOrders]);
  }, []);

  const rows = orders.map(po => {
    const requested = po.totalQty;
    const reserved = po.items.reduce((s, i) => s + i.reservedQty, 0);
    const scanned = po.items.reduce((s, i) => s + i.scannedQty, 0);
    const dispatched = po.items.reduce((s, i) => s + i.dispatchedQty, 0);
    const fillRate = requested > 0 ? Math.round(((dispatched || scanned) / requested) * 100) : 0;

    return {
      poNumber: po.poNumber,
      date: po.poDate,
      warehouse: po.deliveryLocation,
      requested,
      reserved,
      scanned,
      dispatched,
      fillRate: `${fillRate}%`,
      status: po.status,
    };
  });

  function handleExport() {
    exportToExcel(rows, `PO_Fulfilment_Report_${new Date().toISOString().split('T')[0]}`, 'PO Fulfilment');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-xs text-slate-500 hover:text-emerald-600">← Reports</Link>
          <h1 className="text-xl font-black text-slate-900">📋 PO Fulfilment Report</h1>
        </div>
        <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm">
          Export Excel
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">R.O. Number</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Destination Warehouse</th>
              <th className="px-4 py-3 text-right">Requested</th>
              <th className="px-4 py-3 text-right">Reserved</th>
              <th className="px-4 py-3 text-right">Dispatched</th>
              <th className="px-4 py-3 text-right">Fill Rate</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.poNumber}</td>
                <td className="px-4 py-3 text-slate-600">{r.date}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.warehouse}</td>
                <td className="px-4 py-3 text-right font-black">{r.requested}</td>
                <td className="px-4 py-3 text-right font-bold text-amber-700">{r.reserved}</td>
                <td className="px-4 py-3 text-right font-bold text-blue-700">{r.dispatched}</td>
                <td className="px-4 py-3 text-right font-black text-emerald-700">{r.fillRate}</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
