'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore, PurchaseOrder } from '../../lib/store/inventory-store';

export default function PosListPage() {
  const store = getInventoryStore();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    setOrders([...store.purchaseOrders]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Purchase Orders (Blinkit R.O.)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage recommended quantity orders, dispatch labels, GST invoices and warehouse appointments.
          </p>
        </div>
        <div>
          <Link
            href="/ro-import"
            className="inline-flex items-center px-4 py-2.5 rounded-xl font-bold text-sm bg-amber-400 text-amber-950 hover:bg-amber-500 shadow-sm transition-all"
          >
            ⚡ Import New R.O.
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No orders found. Click "Import New R.O." to upload files.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">R.O. Number</th>
                  <th className="px-6 py-3">Warehouse</th>
                  <th className="px-6 py-3">Dates</th>
                  <th className="px-6 py-3">Items / Qty</th>
                  <th className="px-6 py-3">Net Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((po) => {
                  const scannedTotal = po.items.reduce((s, i) => s + i.scannedQty, 0);
                  const reservedTotal = po.items.reduce((s, i) => s + i.reservedQty, 0);
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        <Link href={`/pos/${po.id}`} className="hover:text-emerald-700">
                          {po.poNumber}
                        </Link>
                        <div className="text-xs text-slate-500 font-sans font-normal">
                          Type: {po.roType}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{po.deliveryLocation}</div>
                        <div className="text-xs text-slate-500">Blinkit GST: {po.buyerGstin}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        <div>Date: <strong>{po.poDate}</strong></div>
                        <div>Valid Till: <strong className="text-amber-700">{po.validTill || 'N/A'}</strong></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">
                          {po.items.length} lines &bull; {po.totalQty} pcs
                        </div>
                        <div className="text-xs text-slate-500">
                          Reserved: {reservedTotal} | Scanned: {scannedTotal}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900">
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
                          href={`/pos/${po.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
                        >
                          Manage Order
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
