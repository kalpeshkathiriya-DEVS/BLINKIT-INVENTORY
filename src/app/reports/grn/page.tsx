'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore, GrnEntry } from '../../../lib/store/inventory-store';
import DateRangeFilter, { DateRangeValue, getDefaultDateRange } from '../../../components/DateRangeFilter';
import { exportToExcel } from '../../../lib/excel-export';

export default function GrnReportPage() {
  const store = getInventoryStore();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange());
  const [grns, setGrns] = useState<GrnEntry[]>([]);

  useEffect(() => {
    setGrns([...store.grnEntries]);
  }, []);

  const rows = grns.map(g => {
    const disp = g.items.reduce((s, i) => s + i.dispatchedQty, 0);
    const acc = g.items.reduce((s, i) => s + i.acceptedQty, 0);
    const rej = g.items.reduce((s, i) => s + i.rejectedQty, 0);
    const short = g.items.reduce((s, i) => s + i.shortQty, 0);

    return {
      grnNo: g.grnNo,
      date: g.grnDate,
      deliveryDate: g.deliveryDate,
      ticketDeadline: g.ticketDeadline,
      ticketNo: g.ticketNo || 'N/A',
      dispatched: disp,
      accepted: acc,
      rejected: rej,
      short: short,
      shortRate: disp > 0 ? `${((short / disp) * 100).toFixed(1)}%` : '0%',
    };
  });

  function handleExport() {
    exportToExcel(rows, `GRN_Report_${new Date().toISOString().split('T')[0]}`, 'GRN Report');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-xs text-slate-500 hover:text-emerald-600">← Reports</Link>
          <h1 className="text-xl font-black text-slate-900">✅ GRN &amp; Shortage Report</h1>
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
              <th className="px-4 py-3">GRN No.</th>
              <th className="px-4 py-3">GRN Date</th>
              <th className="px-4 py-3">Delivery Date</th>
              <th className="px-4 py-3">10-Day SLA Deadline</th>
              <th className="px-4 py-3 text-right">Dispatched</th>
              <th className="px-4 py-3 text-right text-emerald-700">Accepted</th>
              <th className="px-4 py-3 text-right text-purple-700">Rejected</th>
              <th className="px-4 py-3 text-right text-rose-700">Shortage</th>
              <th className="px-4 py-3 text-right">Short %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.grnNo}</td>
                <td className="px-4 py-3">{r.date}</td>
                <td className="px-4 py-3">{r.deliveryDate}</td>
                <td className="px-4 py-3 font-semibold text-amber-800">{r.ticketDeadline}</td>
                <td className="px-4 py-3 text-right font-black">{r.dispatched}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700">{r.accepted}</td>
                <td className="px-4 py-3 text-right font-bold text-purple-700">{r.rejected}</td>
                <td className="px-4 py-3 text-right font-black text-rose-700">{r.short}</td>
                <td className="px-4 py-3 text-right font-bold text-rose-600">{r.shortRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
