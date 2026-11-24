'use client';

import React, { useState } from 'react';
import { getInventoryStore } from '../../lib/store/inventory-store';

export default function InwardsPage() {
  const store = getInventoryStore();

  const [supplierId, setSupplierId] = useState(store.suppliers[0]?.id || '');
  const [docType, setDocType] = useState<'bill' | 'challan'>('bill');
  const [docNo, setDocNo] = useState(`BILL-${Math.floor(1000 + Math.random() * 9000)}`);
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNo, setVehicleNo] = useState('GJ-01-XX-9090');

  const [selectedProductId, setSelectedProductId] = useState(store.products[0]?.id || '');
  const [receivedQty, setReceivedQty] = useState(100);
  const [goodQty, setGoodQty] = useState(92);
  const [damagedQty, setDamagedQty] = useState(8);
  const [damageReason, setDamageReason] = useState('Carton damaged in transit');
  const [rate, setRate] = useState(150);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isValidCheck = goodQty + damagedQty === receivedQty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCheck) {
      alert(`Constraint violation: Good (${goodQty}) + Damaged (${damagedQty}) must equal Received (${receivedQty})`);
      return;
    }

    try {
      store.postInward({
        supplierId,
        docType,
        docNo,
        docDate,
        vehicleNo,
        items: [
          {
            productId: selectedProductId,
            receivedQty,
            goodQty,
            damagedQty,
            damageReason: damagedQty > 0 ? damageReason : undefined,
            rate,
            gstPercent: 18,
          },
        ],
      });

      setNotification({
        type: 'success',
        message: `Inward recorded! Good stock (+${goodQty}) added to ledger and auto-allocated to waiting POs. Damaged (+${damagedQty}) logged for supplier credit claim.`,
      });
      setDocNo(`BILL-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Inwards: Purchase Receiving
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Record supplier goods with damage split. Good stock is immediately available and auto-allocated to open POs.
        </p>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-sm font-semibold border ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {notification.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          1. Supplier &amp; Document Header
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700">Supplier / Firm</label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 font-semibold"
            >
              {store.suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.state})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700">Doc Type</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value as any)}
              className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg text-slate-900"
            >
              <option value="bill">Tax Invoice / Bill</option>
              <option value="challan">Delivery Challan</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700">Doc Number *</label>
            <input
              type="text"
              value={docNo}
              onChange={e => setDocNo(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">Vehicle No.</label>
            <input
              type="text"
              value={vehicleNo}
              onChange={e => setVehicleNo(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 pt-2">
          2. Goods Received &amp; Quality Split
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label className="font-bold text-slate-700">Product</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 font-semibold"
            >
              {store.products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.officialName} (SKU: {p.sku})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700">Purchase Rate (₹)</label>
            <input
              type="number"
              value={rate}
              onChange={e => setRate(Number(e.target.value))}
              className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">Total Received Qty *</label>
            <input
              type="number"
              value={receivedQty}
              onChange={e => {
                const rec = Number(e.target.value);
                setReceivedQty(rec);
                setGoodQty(rec - damagedQty);
              }}
              className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg font-black text-slate-900"
            />
          </div>
          <div>
            <label className="font-bold text-emerald-800">Good Qty (Sellable)</label>
            <input
              type="number"
              value={goodQty}
              onChange={e => {
                const g = Number(e.target.value);
                setGoodQty(g);
                setDamagedQty(receivedQty - g);
              }}
              className="mt-1 w-full p-2.5 border border-emerald-300 bg-emerald-50 rounded-lg font-black text-emerald-900"
            />
          </div>
          <div>
            <label className="font-bold text-rose-800">Damaged Qty</label>
            <input
              type="number"
              value={damagedQty}
              onChange={e => {
                const d = Number(e.target.value);
                setDamagedQty(d);
                setGoodQty(receivedQty - d);
              }}
              className="mt-1 w-full p-2.5 border border-rose-300 bg-rose-50 rounded-lg font-black text-rose-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="font-bold text-slate-700">Damage Reason</label>
            <input
              type="text"
              value={damageReason}
              onChange={e => setDamageReason(e.target.value)}
              disabled={damagedQty <= 0}
              placeholder="e.g. Scratched surface, bent bristles"
              className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-100"
            />
          </div>
        </div>

        {/* Live Constraint Banner */}
        <div className={`p-4 rounded-xl text-xs font-bold ${
          isValidCheck ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-300'
        }`}>
          {isValidCheck ? (
            <span>✓ Constraint Valid: Good ({goodQty}) + Damaged ({damagedQty}) = Received ({receivedQty})</span>
          ) : (
            <span>✖ Violation: Good ({goodQty}) + Damaged ({damagedQty}) does not equal Received ({receivedQty})</span>
          )}
        </div>

        <div className="text-right">
          <button
            type="submit"
            disabled={!isValidCheck}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-sm rounded-xl shadow-sm"
          >
            Post Inward Entry to Ledger
          </button>
        </div>
      </form>
    </div>
  );
}
