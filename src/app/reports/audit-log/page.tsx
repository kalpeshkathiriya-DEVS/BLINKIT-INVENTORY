'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore, AuditLogEntry } from '../../../lib/store/inventory-store';
import DateRangeFilter, { DateRangeValue, getDefaultDateRange } from '../../../components/DateRangeFilter';
import { exportToExcel } from '../../../lib/excel-export';

export default function AuditLogReportPage() {
  const store = getInventoryStore();
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange());
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    setLogs([...store.auditLogs]);
  }, []);

  const filteredLogs = logs.filter(log => {
    const time = new Date(log.createdAt).getTime();
    const inDate = time >= dateRange.from.getTime() && time <= dateRange.to.getTime();
    const matchEntity = selectedEntity === 'all' || log.entity === selectedEntity;
    const q = searchTerm.toLowerCase();
    const matchQuery =
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      (log.entityId && log.entityId.toLowerCase().includes(q)) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(q));
    return inDate && matchEntity && matchQuery;
  });

  const highRiskEvents = filteredLogs.filter(
    l => l.action.includes('void') || l.action.includes('shortfall') || l.action.includes('disposal') || l.action.includes('claim')
  ).length;

  const uniqueUsers = new Set(filteredLogs.map(l => l.userName)).size;

  const handleExport = () => {
    const exportData = filteredLogs.map(l => ({
      Timestamp: new Date(l.createdAt).toLocaleString(),
      UserName: l.userName,
      UserRole: l.userRole,
      Action: l.action,
      Entity: l.entity,
      EntityId: l.entityId || '',
      Details: l.details ? JSON.stringify(l.details) : '',
    }));
    exportToExcel(exportData, `System_Audit_Log_${new Date().toISOString().split('T')[0]}`, 'Audit Log');
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
            <span>🔍</span>
            <span>System Audit Log &amp; Governance</span>
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Module:</span>
            <select
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
            >
              <option value="all">All Modules</option>
              <option value="system">System / Admin</option>
              <option value="inward_entry">Inward Receiving</option>
              <option value="po_scan">Scanning &amp; Voids</option>
              <option value="purchase_orders">Purchase Orders</option>
              <option value="dispatches">Dispatches</option>
              <option value="product">Product &amp; Disposal</option>
            </select>
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search action or user..."
            className="p-2 border border-slate-200 rounded-lg text-xs font-semibold w-44"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Audit Events</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{filteredLogs.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-rose-700 uppercase">Critical / High-Risk Events</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{highRiskEvents}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase">Active Operators</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{uniqueUsers}</div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Audit Events Ledger ({filteredLogs.length} recorded)
          </h2>
          <span className="text-xs text-slate-500 font-semibold">
            Immutable &bull; Enforced by Security Definer RPCs
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold sticky top-0">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User &amp; Role</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Details &amp; Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.map(log => {
                const isCritical =
                  log.action.includes('void') ||
                  log.action.includes('shortfall') ||
                  log.action.includes('disposal');

                return (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500 font-sans">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-sans">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">{log.userRole}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        isCritical
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 font-sans">
                      <div className="font-bold">{log.entity}</div>
                      {log.entityId && <div className="text-[10px] text-slate-400 font-mono">{log.entityId}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 font-sans text-xs">
                      {log.details ? (
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[11px] max-w-md">
                          {Object.entries(log.details).map(([k, v]) => (
                            <div key={k}>
                              <strong className="text-slate-700">{k}:</strong> {String(v)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-sans">
                    No audit records match the current filters.
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
