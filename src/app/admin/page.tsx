'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore, Organization, StockSummaryItem } from '../../lib/store/inventory-store';
import { useAuth } from '../../lib/auth-context';

export default function AdminDashboardPage() {
  const store = getInventoryStore();
  const { user, impersonatingOrg, stopImpersonation } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [stock, setStock] = useState<StockSummaryItem[]>([]);

  useEffect(() => {
    setOrg(store.getCurrentOrg());
    setStock(store.getStockSummary());
  }, [impersonatingOrg]);

  const totalGood = stock.reduce((s, p) => s + p.good, 0);
  const totalReserved = stock.reduce((s, p) => s + p.reserved, 0);
  const totalAvailable = stock.reduce((s, p) => s + p.available, 0);
  const totalDamaged = stock.reduce((s, p) => s + p.damaged, 0);
  const totalOpenPos = store.purchaseOrders.filter(p => p.status === 'new' || p.status === 'reserved' || p.status === 'in_progress').length;
  const totalOpenClaims = store.claims.filter(c => c.status === 'open' || c.status === 'raised').length;

  return (
    <div className="space-y-6">
      {/* Impersonation Banner if SuperAdmin is viewing */}
      {impersonatingOrg && (
        <div className="bg-purple-900 text-white p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md">
          <div className="flex items-center gap-2">
            <span>👁️</span>
            <span>
              SUPERADMIN IMPERSONATION MODE: Viewing <strong>{impersonatingOrg.name}</strong> (Read-Only)
            </span>
          </div>
          <button
            onClick={stopImpersonation}
            className="px-3 py-1 bg-white text-purple-900 hover:bg-purple-100 rounded-lg font-black transition-colors"
          >
            Exit to SuperAdmin Panel ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
              Business Admin Hub
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
              {org?.category || 'Home & Kitchen'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
              {org?.plan || 'Pro'} Plan
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            {org?.name || 'Apex Home Essentials Pvt Ltd'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            GSTIN: {org?.gstin || '24AAACA9876Q1Z5'} &bull; State: {org?.state || 'Gujarat'} &bull; Status: <span className="text-emerald-700 font-bold uppercase">{org?.status || 'Active'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/ro-import"
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>Import Blinkit R.O.</span>
          </Link>
          <Link
            href="/admin/profile"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all flex items-center gap-1"
          >
            <span>⚙️</span>
            <span>Org Settings</span>
          </Link>
        </div>
      </div>

      {/* Realtime KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Good Stock</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalGood}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Physical units</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-amber-700 uppercase">Reserved</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{totalReserved}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">PO commitments</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-emerald-50/30">
          <div className="text-[11px] font-bold text-emerald-800 uppercase">Available (ATP)</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{totalAvailable}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Good - Reserved</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-rose-700 uppercase">Damaged</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{totalDamaged}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">Needs action</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-blue-700 uppercase">Open POs</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{totalOpenPos}</div>
          <div className="text-[10px] text-blue-600 mt-0.5">Active fulfillment</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-purple-700 uppercase">Open Claims</div>
          <div className="text-2xl font-black text-purple-700 mt-1">{totalOpenClaims}</div>
          <div className="text-[10px] text-purple-600 mt-0.5">Blinkit disputes</div>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div>
        <h2 className="text-base font-black text-slate-900 mb-3">Admin Operations &amp; Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/staff"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3.5">
              <div className="text-3xl p-2 bg-emerald-50 rounded-xl group-hover:scale-105 transition-transform">👥</div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Staff &amp; Roles Management
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Provision warehouse staff accounts with Phone + 4-6 digit PIN, toggle activation status, or reset credentials.
                </p>
                <div className="mt-3 text-xs font-semibold text-emerald-600">Manage Staff →</div>
              </div>
            </div>
          </Link>

          <Link
            href="/products"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3.5">
              <div className="text-3xl p-2 bg-emerald-50 rounded-xl group-hover:scale-105 transition-transform">📦</div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Product Master &amp; Barcodes
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  18 active SKUs, Code128 barcode label generator (38x25mm &amp; A4 sheets), bulk Excel upload, and Blinkit item mapping.
                </p>
                <div className="mt-3 text-xs font-semibold text-emerald-600">View Products →</div>
              </div>
            </div>
          </Link>

          <Link
            href="/ro-import"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-amber-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3.5">
              <div className="text-3xl p-2 bg-amber-50 rounded-xl group-hover:scale-105 transition-transform">⚡</div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                  Blinkit R.O. Importer (05a Spec)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload Excel (.xlsx) + Delivery Challan (.pdf). Validates item sums against footer totals, auto-detects supply type.
                </p>
                <div className="mt-3 text-xs font-semibold text-amber-700">Import Orders →</div>
              </div>
            </div>
          </Link>

          <Link
            href="/pos"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3.5">
              <div className="text-3xl p-2 bg-slate-50 rounded-xl group-hover:scale-105 transition-transform">📋</div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Purchase Orders &amp; Dispatches
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Generate single-UPC carton labels, GST Tax Invoices (IRN/E-way ready), and book feeder warehouse appointments.
                </p>
                <div className="mt-3 text-xs font-semibold text-emerald-600">Open Orders →</div>
              </div>
            </div>
          </Link>

          <Link
            href="/stock"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3.5">
              <div className="text-3xl p-2 bg-slate-50 rounded-xl group-hover:scale-105 transition-transform">📒</div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Stock Ledger &amp; Damaged Disposal
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  6-bucket live ledger (Good, Reserved, In-transit, Damaged, Return pending, Written off) with atomic disposal modal.
                </p>
                <div className="mt-3 text-xs font-semibold text-emerald-600">Stock &amp; Disposal →</div>
              </div>
            </div>
          </Link>

          <Link
            href="/reports"
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3.5">
              <div className="text-3xl p-2 bg-emerald-50 rounded-xl group-hover:scale-105 transition-transform">📊</div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Reports &amp; Intelligence (11 Reports)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Export Excel sheets for Purchase Register, Staff Productivity, Valuation, GRN Shortages, Claims, and Dead Stock.
                </p>
                <div className="mt-3 text-xs font-semibold text-emerald-600">View All Reports →</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
