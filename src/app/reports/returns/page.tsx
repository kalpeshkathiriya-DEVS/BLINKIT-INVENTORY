'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore, ReturnReceipt } from '../../../lib/store/inventory-store';
import { exportToExcel } from '../../../lib/excel-export';

export default function ReturnsReportPage() {
  const store = getInventoryStore();
  const [returns, setReturns] = useState<ReturnReceipt[]>([]);

  useEffect(() => {
    setReturns([...store.returnReceipts]);
  }, []);

  const rows = returns.map(r => {
    const exp = r.items.reduce((s, i) => s + i.expectedQty, 0);
    const good = r.items.reduce((s, i) => s + i.goodQty, 0);
    const dam = r.items.reduce((s, i) => s + i.damagedQty, 0);
    const miss = r.items.reduce((s, i) => s + i.missingQty, 0);
    const recoveryRate = exp > 0 ? `${Math.round((good / exp) * 100)}%` : '0%';

    return {
      dnNo: r.dnNo,
      receivedDate: r.receivedDate,
      pickupDeadline: r.pickupDeadline,
      ticketNo: r.pickupTicketNo || 'N/A',
      expected: exp,
      good,
      damaged: dam,
      missing: miss,
      recoveryRate,
    };
  });

  function handleExport() {
    exportToExcel(rows, `Returns_Report_${new Date().toISOString().split('T')[0]}`, 'Returns');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-xs text-slate-500 hover:text-emerald-600">← Reports</Link>
          <h1 className="text-xl font-black text-slate-900">↩️ Returns &amp; DN Recovery Report</h1>
        </div>
        <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm">
          Export Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">DN Number</th>
              <th className="px-4 py-3">Received Date</th>
              <th className="px-4 py-3">7-Day Deadline</th>
              <th className="px-4 py-3 text-right">Expected</th>
              <th className="px-4 py-3 text-right text-emerald-700">Good Recovered</th>
              <th className="px-4 py-3 text-right text-rose-700">Damaged</th>
              <th className="px-4 py-3 text-right text-amber-700">Missing</th>
              <th className="px-4 py-3 text-right">Recovery Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.dnNo}</td>
                <td className="px-4 py-3">{r.receivedDate}</td>
                <td className="px-4 py-3 font-semibold text-rose-700">{r.pickupDeadline}</td>
                <td className="px-4 py-3 text-right font-black">{r.expected}</td>
                <td className="px-4 py-3 text-right font-black text-emerald-700">{r.good}</td>
                <td className="px-4 py-3 text-right font-bold text-rose-700">{r.damaged}</td>
                <td className="px-4 py-3 text-right font-bold text-amber-700">{r.missing}</td>
                <td className="px-4 py-3 text-right font-black text-emerald-600">{r.recoveryRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
