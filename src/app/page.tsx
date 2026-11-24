'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getInventoryStore, PurchaseOrder, StockSummaryItem } from '../lib/store/inventory-store';
import { evaluateGrnTicketDeadline, evaluateDnPickupDeadline } from '../lib/blinkit/alerts';
import { useAuth } from '../lib/auth-context';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const store = getInventoryStore();

  useEffect(() => {
    if (user?.role === 'user') {
      router.push('/scan');
    } else if (user?.role === 'superadmin') {
      router.push('/super');
    }
  }, [user, router]);
  const [stock, setStock] = useState<StockSummaryItem[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);

  useEffect(() => {
    setStock(store.getStockSummary());
    setOrders([...store.purchaseOrders]);
    setClaims([...store.claims]);
    setReturns([...store.returnReceipts]);
  }, []);

  const totalGood = stock.reduce((s, i) => s + i.good, 0);
  const totalReserved = stock.reduce((s, i) => s + i.reserved, 0);
  const totalAvailable = totalGood - totalReserved;
  const totalInTransit = stock.reduce((s, i) => s + i.inTransit, 0);
  const totalReturnPending = stock.reduce((s, i) => s + i.returnPending, 0);
  const openClaimsAmount = claims
    .filter(c => c.status === 'open' || c.status === 'raised')
    .reduce((s, c) => s + (c.amount || 0), 0);

  // Simulated Alert Checks
  const activeGrnAlert = evaluateGrnTicketDeadline(
    new Date(Date.now() - 7.5 * 24 * 60 * 60 * 1000).toISOString(),
    'claim-sample-1',
    '2011710136067'
  );

  const activeDnAlert = evaluateDnPickupDeadline(
    new Date(Date.now() - 5.5 * 24 * 60 * 60 * 1000).toISOString(),
    'ret-sample-1',
    '2011710136067',
    'DN-201171'
  );

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Warehouse Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Blinkit Quick-Commerce Order Processing & Real-time Stock Ledger
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/ro-import"
            className="inline-flex items-center px-4 py-2.5 rounded-xl font-bold text-sm bg-amber-400 text-amber-950 hover:bg-amber-500 shadow-sm transition-all"
          >
            ⚡ Import Blinkit R.O.
          </Link>
          <Link
            href="/scan"
            className="inline-flex items-center px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
          >
            📱 Team Scan
          </Link>
          <Link
            href="/inwards"
            className="inline-flex items-center px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 text-slate-800 hover:bg-slate-200 transition-all"
          >
            + Inwards
          </Link>
          <Link
            href="/grn-claims"
            className="inline-flex items-center px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 text-slate-800 hover:bg-slate-200 transition-all"
          >
            GRN / Claims
          </Link>
        </div>
      </div>

      {/* Critical SLA Alerts based on Blinkit Rules (Day 7/9 GRN & 7-day DN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GRN 10-day Discrepancy Alert */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block px-2 py-0.5 text-[11px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 rounded">
                10-Day GRN Window ({activeGrnAlert.daysLeft} Days Left)
              </span>
              <h3 className="font-bold text-slate-900 mt-1 text-sm">
                Shortage Claim Deadline: R.O. #{activeGrnAlert.poNumber}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {activeGrnAlert.message}
              </p>
            </div>
            <Link
              href="/grn-claims"
              className="text-xs font-bold text-amber-800 hover:underline shrink-0 ml-3"
            >
              Upload Proof &rarr;
            </Link>
          </div>
        </div>

        {/* 7-day DN Pickup Alert */}
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block px-2 py-0.5 text-[11px] font-black uppercase tracking-wider bg-red-200 text-red-900 rounded">
                7-Day Liquidation Risk ({activeDnAlert.daysLeft} Days Left)
              </span>
              <h3 className="font-bold text-slate-900 mt-1 text-sm">
                Blinkit DN Pickup: {activeDnAlert.dnNo}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {activeDnAlert.message}
              </p>
            </div>
            <Link
              href="/grn-claims"
              className="text-xs font-bold text-red-800 hover:underline shrink-0 ml-3"
            >
              Raise Ticket &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* 6 Stock Buckets Ledger KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Good Stock */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Good Stock
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalGood.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Physical in racks</div>
        </div>

        {/* Reserved */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            Reserved
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {totalReserved.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Held for open POs</div>
        </div>

        {/* Available to Promise */}
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
            Available (ATP)
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {totalAvailable.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Good - Reserved</div>
        </div>

        {/* In Transit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            In Transit
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {totalInTransit.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Dispatched to Blinkit</div>
        </div>

        {/* Return Pending */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
            Return Pending
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">
            {totalReturnPending.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Blinkit rejected stock</div>
        </div>

        {/* Open Claims */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
            Shortage Claims
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">
            ₹{openClaimsAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Value under dispute</div>
        </div>
      </div>

      {/* Orders List / Quick Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Active Recommended Orders (R.O.)</h2>
            <p className="text-xs text-slate-500">Live scanning, reservation and dispatch progress</p>
          </div>
          <Link
            href="/pos"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            View All ({orders.length}) &rarr;
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              📦
            </div>
            <h3 className="text-base font-bold text-slate-800 mt-3">No Purchase Orders Loaded Yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Upload your Blinkit Recommended Quantity Order (R.O.) Excel and PDF files to get started.
            </p>
            <Link
              href="/ro-import"
              className="inline-flex items-center px-4 py-2 mt-4 rounded-xl font-bold text-sm bg-amber-400 text-amber-950 hover:bg-amber-500"
            >
              Upload Sample R.O. 2011710136067
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">R.O. Number</th>
                  <th className="px-6 py-3">Warehouse</th>
                  <th className="px-6 py-3">Items / Qty</th>
                  <th className="px-6 py-3">Net Value</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((po) => {
                  const scannedTotal = po.items.reduce((s, i) => s + i.scannedQty, 0);
                  const progressPct = po.totalQty > 0 ? Math.round((scannedTotal / po.totalQty) * 100) : 0;
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        <Link href={`/pos/${po.id}`} className="hover:text-emerald-700">
                          {po.poNumber}
                        </Link>
                        <div className="text-xs text-slate-500 font-sans font-normal">
                          Date: {po.poDate} | Exp: {po.validTill || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{po.deliveryLocation}</div>
                        <div className="text-xs text-slate-500">GST: {po.buyerGstin}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">
                          {scannedTotal} / {po.totalQty} units
                        </div>
                        <div className="w-28 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        ₹{Math.round(po.netAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          po.status === 'dispatched'
                            ? 'bg-blue-100 text-blue-800'
                            : po.status === 'reserved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : po.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {po.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link
                          href="/scan"
                          className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                        >
                          Scan
                        </Link>
                        <Link
                          href={`/pos/${po.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
