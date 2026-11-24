'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore, PoScan } from '../../../lib/store/inventory-store';
import DateRangeFilter, { DateRangeValue, getDefaultDateRange } from '../../../components/DateRangeFilter';
import { exportToExcel } from '../../../lib/excel-export';

export default function StaffReportPage() {
  const store = getInventoryStore();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange());
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [scans, setScans] = useState<PoScan[]>([]);

  useEffect(() => {
    setScans([...store.poScans].reverse());
  }, []);

  // Filter by date range and staff
  const filteredScans = scans.filter(s => {
    const scanTime = new Date(s.createdAt).getTime();
    const fromTime = dateRange.from.getTime();
    const toTime = dateRange.to.getTime();
    const inDateRange = scanTime >= fromTime && scanTime <= toTime;
    const matchesStaff = selectedStaff === 'all' || s.userName.toLowerCase() === selectedStaff.toLowerCase();
    return inDateRange && matchesStaff;
  });

  // Calculate KPIs
  const totalScans = filteredScans.length;
  const validScans = filteredScans.filter(s => !s.isVoided);
  const totalUnits = validScans.reduce((sum, s) => sum + s.qty, 0);
  const totalVoids = filteredScans.filter(s => s.isVoided).length;
  const accuracyRate = totalScans > 0 ? Math.round(((totalScans - totalVoids) / totalScans) * 100) : 100;

  // Staff breakdown map
  const staffSummaryMap: Record<string, { name: string; totalScans: number; totalUnits: number; voids: number; lastActive: string }> = {};

  filteredScans.forEach(s => {
    if (!staffSummaryMap[s.userName]) {
      staffSummaryMap[s.userName] = {
        name: s.userName,
        totalScans: 0,
        totalUnits: 0,
        voids: 0,
        lastActive: s.createdAt,
      };
    }
    const staff = staffSummaryMap[s.userName];
    staff.totalScans += 1;
    if (s.isVoided) {
      staff.voids += 1;
    } else {
      staff.totalUnits += s.qty;
    }
    if (new Date(s.createdAt) > new Date(staff.lastActive)) {
      staff.lastActive = s.createdAt;
    }
  });

  const staffBreakdown = Object.values(staffSummaryMap);

  const handleExport = () => {
    const exportData = filteredScans.map(s => ({
      Timestamp: new Date(s.createdAt).toLocaleString(),
      StaffName: s.userName,
      ScannedCode: s.scannedCode,
      Quantity: s.qty,
      Status: s.isVoided ? 'Voided' : 'Valid',
      VoidReason: s.voidReason || '',
      VoidedAt: s.voidedAt ? new Date(s.voidedAt).toLocaleString() : '',
    }));
    exportToExcel(exportData, `Staff_Productivity_Report_${new Date().toISOString().split('T')[0]}`, 'Staff Productivity');
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
            <span>👥</span>
            <span>Staff Productivity &amp; Error Report</span>
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Staff Member:</span>
          <select
            value={selectedStaff}
            onChange={e => setSelectedStaff(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
          >
            <option value="all">All Staff Members</option>
            {store.staffProfiles.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Scan Events</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalScans}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase">Units Processed</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{totalUnits}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-rose-700 uppercase">Voids / Errors</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{totalVoids}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-blue-700 uppercase">Accuracy Rate</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{accuracyRate}%</div>
        </div>
      </div>

      {/* Staff Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Staff Summary Breakdown</h2>
          <span className="text-xs font-medium text-slate-500">{staffBreakdown.length} active scanners</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Staff Name</th>
                <th className="px-6 py-3 text-right">Total Scans</th>
                <th className="px-6 py-3 text-right">Units Scanned</th>
                <th className="px-6 py-3 text-right text-rose-600">Voids</th>
                <th className="px-6 py-3 text-right">Accuracy Rate</th>
                <th className="px-6 py-3">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffBreakdown.map(staff => {
                const staffAcc = staff.totalScans > 0 ? Math.round(((staff.totalScans - staff.voids) / staff.totalScans) * 100) : 100;
                return (
                  <tr key={staff.name} className="hover:bg-slate-50/80">
                    <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-black text-xs text-slate-700">
                        {staff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{staff.name}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-slate-800">{staff.totalScans}</td>
                    <td className="px-6 py-3.5 text-right font-black text-emerald-700">{staff.totalUnits}</td>
                    <td className="px-6 py-3.5 text-right font-black text-rose-600">{staff.voids}</td>
                    <td className="px-6 py-3.5 text-right font-black">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${
                        staffAcc >= 95 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {staffAcc}%
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px]">
                      {new Date(staff.lastActive).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {staffBreakdown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No scan activity found for this period or staff filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Scan Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Individual Scan Log ({filteredScans.length} events)</h2>
        </div>

        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold sticky top-0">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Staff Name</th>
                <th className="px-4 py-3 font-mono">Barcode / UPC</th>
                <th className="px-4 py-3 text-right">Units</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Void Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredScans.map(scan => (
                <tr key={scan.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-500 font-sans">
                    {new Date(scan.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-bold font-sans text-slate-900">{scan.userName}</td>
                  <td className="px-4 py-2.5 text-slate-700">{scan.scannedCode}</td>
                  <td className="px-4 py-2.5 text-right font-black text-slate-900">{scan.qty}</td>
                  <td className="px-4 py-2.5 text-center font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      scan.isVoided ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {scan.isVoided ? 'Voided' : 'Valid'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-sans text-slate-600">
                    {scan.voidReason || '—'}
                  </td>
                </tr>
              ))}
              {filteredScans.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-sans">
                    No scans match the current filters.
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
