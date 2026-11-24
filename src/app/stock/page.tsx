'use client';

import React, { useState, useEffect } from 'react';
import { getInventoryStore, StockSummaryItem, StockMovement, DamagedStockAction } from '../../lib/store/inventory-store';

export default function StockLedgerPage() {
  const store = getInventoryStore();
  const [stock, setStock] = useState<StockSummaryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [damagedActions, setDamagedActions] = useState<DamagedStockAction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Disposal Modal State
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [disposalProductId, setDisposalProductId] = useState<string>('');
  const [disposalQty, setDisposalQty] = useState<number>(1);
  const [disposalAction, setDisposalAction] = useState<'repaired' | 'returned_to_supplier' | 'discarded'>('repaired');
  const [disposalNotes, setDisposalNotes] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const refreshData = () => {
    setStock(store.getStockSummary());
    setMovements([...store.stockMovements].reverse());
    setDamagedActions([...store.damagedStockActions]);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const totalDamagedUnits = stock.reduce((sum, item) => sum + item.damaged, 0);

  const filteredStock = stock.filter(item => {
    const q = searchTerm.toLowerCase();
    return (
      item.internalName.toLowerCase().includes(q) ||
      item.officialName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.upc.toLowerCase().includes(q)
    );
  });

  const selectedProductMovements = selectedProductId
    ? movements.filter(m => m.productId === selectedProductId)
    : movements.slice(0, 30);

  const handleOpenDisposal = (productId?: string) => {
    const targetId = productId || stock.find(s => s.damaged > 0)?.productId || stock[0]?.productId || '';
    setDisposalProductId(targetId);
    const prod = stock.find(s => s.productId === targetId);
    setDisposalQty(prod?.damaged ? Math.min(prod.damaged, 1) : 1);
    setDisposalNotes('');
    setDisposalAction('repaired');
    setShowDisposalModal(true);
  };

  const handleExecuteDisposal = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedProd = stock.find(s => s.productId === disposalProductId);
      if (!selectedProd) throw new Error('Product not found');

      if (disposalQty > selectedProd.damaged) {
        throw new Error(`Quantity exceeds available damaged stock (${selectedProd.damaged} units).`);
      }

      store.disposeDamaged({
        productId: disposalProductId,
        qty: disposalQty,
        action: disposalAction,
        notes: disposalNotes,
      });

      refreshData();
      setShowDisposalModal(false);

      const actionText =
        disposalAction === 'repaired'
          ? 'repaired and credited back to Good Stock ATP'
          : disposalAction === 'returned_to_supplier'
          ? 'marked as Returned to Supplier (Written Off for credit)'
          : 'discarded as scrap (Written Off)';

      setNotification({
        type: 'success',
        message: `Success: ${disposalQty} unit(s) of "${selectedProd.officialName}" ${actionText}. Ledger updated atomically.`,
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const currentDisposalProduct = stock.find(s => s.productId === disposalProductId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Stock Ledger (Immutable Audit Trail)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Golden Rule: Stock numbers are never directly edited; every unit change is an insert into stock_movements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenDisposal()}
            className={`px-4 py-2.5 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all ${
              totalDamagedUnits > 0
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
            disabled={totalDamagedUnits === 0}
          >
            <span>⚠️</span>
            <span>Dispose Damaged Stock ({totalDamagedUnits})</span>
          </button>

          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search SKU or UPC..."
            className="w-full sm:w-48 p-2.5 border border-slate-200 rounded-xl text-xs font-semibold"
          />
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 ml-4">✕</button>
        </div>
      )}

      {/* Stock Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Current Stock Buckets ({filteredStock.length} Products)
          </h2>
          <span className="text-xs text-slate-500 font-semibold">
            Formula: Available = Good - Reserved
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Product / SKU</th>
                <th className="px-4 py-3">UPC</th>
                <th className="px-4 py-3 text-right">Good Stock</th>
                <th className="px-4 py-3 text-right">Reserved</th>
                <th className="px-4 py-3 text-right bg-emerald-50 text-emerald-900">Available (ATP)</th>
                <th className="px-4 py-3 text-right">In Transit</th>
                <th className="px-4 py-3 text-right text-rose-700">Damaged</th>
                <th className="px-4 py-3 text-right">Return Pending</th>
                <th className="px-4 py-3 text-right">Written Off</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStock.map(p => (
                <tr
                  key={p.productId}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    selectedProductId === p.productId ? 'bg-amber-50/50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{p.officialName}</div>
                    <div className="text-slate-500 text-[11px] font-mono">
                      SKU: {p.sku} &bull; Internal: {p.internalName}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-700">{p.upc}</td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">{p.good}</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">{p.reserved}</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-700 bg-emerald-50/50">
                    {p.available}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{p.inTransit}</td>
                  <td className="px-4 py-3 text-right font-bold text-rose-700">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{p.damaged}</span>
                      {p.damaged > 0 && (
                        <button
                          onClick={() => handleOpenDisposal(p.productId)}
                          className="px-1.5 py-0.5 text-[9px] font-black bg-rose-100 hover:bg-rose-200 text-rose-800 rounded uppercase"
                          title="Dispose damaged units"
                        >
                          Action
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-purple-700">{p.returnPending}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-500">{p.writtenOff}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        setSelectedProductId(selectedProductId === p.productId ? '' : p.productId)
                      }
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
                    >
                      {selectedProductId === p.productId ? 'Viewing' : 'Ledger'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Damaged Stock Actions Log */}
      {damagedActions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/40">
            <h2 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <span>🛠️</span>
              <span>Damaged Stock Disposal Audit History</span>
            </h2>
            <span className="text-xs font-bold text-rose-700">{damagedActions.length} recorded</span>
          </div>

          <div className="overflow-x-auto max-h-[220px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Date &amp; Time</th>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5 text-right">Units</th>
                  <th className="px-4 py-2.5">Action Taken</th>
                  <th className="px-4 py-2.5">Notes</th>
                  <th className="px-4 py-2.5">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {damagedActions.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-bold text-slate-900">{a.productName}</td>
                    <td className="px-4 py-2 text-right font-black text-rose-700">{a.qty}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        a.action === 'repaired'
                          ? 'bg-emerald-100 text-emerald-800'
                          : a.action === 'returned_to_supplier'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {a.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{a.notes || '—'}</td>
                    <td className="px-4 py-2 font-semibold text-slate-800">{a.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ledger Movements Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {selectedProductId ? 'Filtered Movement History' : 'Recent Global Ledger Entries (Audit)'}
          </h2>
          {selectedProductId && (
            <button
              onClick={() => setSelectedProductId('')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 sticky top-0 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Bucket</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {selectedProductMovements.map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-500 font-sans">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-bold uppercase text-slate-800">{m.bucket}</span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-black ${
                    m.qty > 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {m.qty > 0 ? `+${m.qty}` : m.qty}
                  </td>
                  <td className="px-4 py-2.5 uppercase font-bold text-slate-700">{m.reason}</td>
                  <td className="px-4 py-2.5 text-slate-500 font-sans">{m.refTable || 'manual'}</td>
                  <td className="px-4 py-2.5 font-sans font-semibold text-slate-800">{m.userName || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Damaged Stock Disposal Modal */}
      {showDisposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>🛠️</span>
                <span>Damaged Stock Disposal (Admin)</span>
              </h3>
              <button
                onClick={() => setShowDisposalModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteDisposal} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Product</label>
                <select
                  value={disposalProductId}
                  onChange={e => {
                    setDisposalProductId(e.target.value);
                    const p = stock.find(s => s.productId === e.target.value);
                    if (p) setDisposalQty(Math.min(Math.max(p.damaged, 1), disposalQty));
                  }}
                  className="w-full p-2.5 border rounded-xl font-semibold bg-white"
                >
                  {stock.map(p => (
                    <option key={p.productId} value={p.productId}>
                      {p.officialName} (Damaged: {p.damaged} units)
                    </option>
                  ))}
                </select>
                {currentDisposalProduct && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Currently Available Damaged Stock: <strong className="text-rose-600">{currentDisposalProduct.damaged} units</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Disposal Action</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDisposalAction('repaired')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                      disposalAction === 'repaired'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-base mb-1">✅</div>
                    <div>Repaired</div>
                    <div className="text-[9px] font-normal text-emerald-700 mt-0.5">→ Move to Good</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisposalAction('returned_to_supplier')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                      disposalAction === 'returned_to_supplier'
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-base mb-1">↩️</div>
                    <div>Return Supplier</div>
                    <div className="text-[9px] font-normal text-blue-700 mt-0.5">→ Written Off</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisposalAction('discarded')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                      disposalAction === 'discarded'
                        ? 'bg-rose-50 border-rose-500 text-rose-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-base mb-1">🗑️</div>
                    <div>Discard / Scrap</div>
                    <div className="text-[9px] font-normal text-rose-700 mt-0.5">→ Written Off</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity to Dispose</label>
                  <input
                    type="number"
                    min="1"
                    max={currentDisposalProduct?.damaged || 1}
                    value={disposalQty}
                    onChange={e => setDisposalQty(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 border rounded-xl font-black text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ledger Target</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700">
                    {disposalAction === 'repaired'
                      ? 'bucket: good (ATP)'
                      : 'bucket: written_off'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason / Notes</label>
                <textarea
                  value={disposalNotes}
                  onChange={e => setDisposalNotes(e.target.value)}
                  placeholder="e.g. Replaced defective packaging, returning batch to supplier on debit note, crushed in unloading..."
                  className="w-full p-2.5 border rounded-xl text-xs h-20"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowDisposalModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-sm"
                >
                  Execute Disposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
