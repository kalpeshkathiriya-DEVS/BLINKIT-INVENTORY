'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getInventoryStore } from '../../../lib/store/inventory-store';
import DateRangeFilter, { DateRangeValue, getDefaultDateRange } from '../../../components/DateRangeFilter';
import { exportToExcel } from '../../../lib/excel-export';

export default function SupplierDamageReportPage() {
  const store = getInventoryStore();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange());

  const damageRows = [
    { supplier: 'Bharat Plastics & Brushes', received: 450, good: 432, damaged: 18, damageRate: '4.0%', claimValue: 2700, status: 'Claim Raised' },
    { supplier: 'Apex Home Essentials Factory', received: 800, good: 785, damaged: 15, damageRate: '1.9%', claimValue: 1850, status: 'Credit Settled' },
  ];

  function handleExport() {
    exportToExcel(damageRows, `Supplier_Damage_Report_${new Date().toISOString().split('T')[0]}`, 'Supplier Damage');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-xs text-slate-500 hover:text-emerald-600">← Reports</Link>
          <h1 className="text-xl font-black text-slate-900">⚠️ Supplier Damage Report</h1>
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
              <th className="px-4 py-3">Supplier Name</th>
              <th className="px-4 py-3 text-right">Received Units</th>
              <th className="px-4 py-3 text-right">Good Units</th>
              <th className="px-4 py-3 text-right">Damaged Units</th>
              <th className="px-4 py-3 text-right">Damage Rate</th>
              <th className="px-4 py-3 text-right">Claim Amount</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {damageRows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-900">{r.supplier}</td>
                <td className="px-4 py-3 text-right font-black">{r.received}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700">{r.good}</td>
                <td className="px-4 py-3 text-right font-black text-rose-700">{r.damaged}</td>
                <td className="px-4 py-3 text-right font-bold text-rose-600">{r.damageRate}</td>
                <td className="px-4 py-3 text-right font-bold">₹{r.claimValue.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
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
