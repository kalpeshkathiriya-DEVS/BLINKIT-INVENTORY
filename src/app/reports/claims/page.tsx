'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore, Claim } from '../../../lib/store/inventory-store';
import DateRangeFilter, { DateRangeValue, getDefaultDateRange } from '../../../components/DateRangeFilter';
import { exportToExcel } from '../../../lib/excel-export';

export default function ClaimsReportPage() {
  const store = getInventoryStore();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange());
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    setClaims([...store.claims]);
  }, []);

  const totalClaimAmount = claims.reduce((s, c) => s + (c.amount || 0), 0);
  const openAmount = claims.filter(c => c.status === 'open' || c.status === 'raised').reduce((s, c) => s + (c.amount || 0), 0);
  const settledAmount = claims.filter(c => c.status === 'settled').reduce((s, c) => s + (c.amount || 0), 0);

  function handleExport() {
    exportToExcel(claims, `Claims_Report_${new Date().toISOString().split('T')[0]}`, 'Claims');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-xs text-slate-500 hover:text-emerald-600">← Reports</Link>
          <h1 className="text-xl font-black text-slate-900">💰 Shortage &amp; Rejection Claims</h1>
        </div>
        <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm">
          Export Excel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Claims Value</div>
          <div className="text-2xl font-black text-slate-900 mt-1">₹{Math.round(totalClaimAmount).toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-amber-700 uppercase">Under Dispute (Open)</div>
          <div className="text-2xl font-black text-amber-700 mt-1">₹{Math.round(openAmount).toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase">Settled by Blinkit</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">₹{Math.round(settledAmount).toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Claim ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Units</th>
              <th className="px-4 py-3 text-right">Claim Amount</th>
              <th className="px-4 py-3">SLA Deadline</th>
              <th className="px-4 py-3">Ticket No.</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {claims.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.id.slice(0, 14)}</td>
                <td className="px-4 py-3 uppercase font-semibold text-slate-700">{c.type}</td>
                <td className="px-4 py-3 text-right font-black">{c.qty}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">₹{Math.round(c.amount).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 font-medium text-amber-800">{c.ticketDeadline}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{c.ticketNo || 'Unassigned'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    c.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {c.status}
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
