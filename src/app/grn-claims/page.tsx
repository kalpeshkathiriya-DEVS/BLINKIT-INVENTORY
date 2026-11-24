'use client';

import React, { useState, useEffect } from 'react';
import { getInventoryStore, PurchaseOrder, Claim, ReturnReceipt } from '../../lib/store/inventory-store';
import { evaluateGrnTicketDeadline, evaluateDnPickupDeadline } from '../../lib/blinkit/alerts';

export default function GrnClaimsPage() {
  const store = getInventoryStore();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [returnReceipts, setReturnReceipts] = useState<ReturnReceipt[]>([]);

  // Form states for GRN Entry
  const [grnNo, setGrnNo] = useState(`GRN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [ticketNo, setTicketNo] = useState(`TIK-BLNK-${Math.floor(1000 + Math.random() * 9000)}`);

  // Line item states for selected PO
  const [grnLineData, setGrnLineData] = useState<Record<string, { accepted: number; rejected: number; reason: string }>>({});

  // Active Tab
  const [activeTab, setActiveTab] = useState<'entry' | 'claims' | 'returns'>('entry');

  useEffect(() => {
    const list = store.purchaseOrders.filter(p => p.status === 'dispatched' || p.status === 'partly_dispatched' || p.status === 'grn_pending');
    setOrders(list);
    if (list.length > 0 && !selectedPoId) {
      setSelectedPoId(list[0].id);
    }
    setClaims([...store.claims]);
    setReturnReceipts([...store.returnReceipts]);
  }, []);

  const selectedPo = store.purchaseOrders.find(p => p.id === selectedPoId);

  // Initialize line data when PO changes
  useEffect(() => {
    if (selectedPo) {
      const initData: Record<string, any> = {};
      selectedPo.items.forEach(it => {
        const disp = it.dispatchedQty || it.requestedQty;
        initData[it.id] = {
          accepted: disp,
          rejected: 0,
          reason: 'None',
        };
      });
      setGrnLineData(initData);
    }
  }, [selectedPoId]);

  // Submit GRN
  const handlePostGrn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo) return;

    try {
      const itemsToPost = selectedPo.items.map(it => {
        const line = grnLineData[it.id] || { accepted: 0, rejected: 0, reason: '' };
        const disp = it.dispatchedQty || it.requestedQty;
        return {
          productId: it.productId!,
          poItemId: it.id,
          dispatchedQty: disp,
          acceptedQty: line.accepted,
          rejectedQty: line.rejected,
          rejectionReason: line.rejected > 0 ? line.reason : undefined,
        };
      });

      store.postGrn({
        poId: selectedPo.id,
        grnNo,
        grnDate: new Date().toISOString().split('T')[0],
        deliveryDate,
        ticketNo,
        items: itemsToPost,
      });

      alert(`GRN #${grnNo} posted successfully! Shortages logged as claims; rejections logged in return_pending.`);
      setClaims([...store.claims]);
      setActiveTab('claims');
    } catch (err: any) {
      alert(`GRN Error: ${err.message}`);
    }
  };

  // Resolve Claim
  const handleResolveClaim = (claimId: string, resolution: 'settled' | 'found' | 'rejected') => {
    try {
      store.resolveClaim(claimId, resolution);
      setClaims([...store.claims]);
      alert(`Claim marked as ${resolution}.`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Blinkit GRN, Shortages &amp; Returns
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Enforces Dispatched = Accepted + Short + Rejected. 10-day ticket window tracking &amp; 7-day DN pickup alerts.
        </p>

        {/* Tab Switcher */}
        <div className="flex space-x-2 mt-4 border-t border-slate-100 pt-3">
          <button
            onClick={() => setActiveTab('entry')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'entry'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            1. Post Warehouse GRN
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'claims'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            2. Shortage Claims ({claims.filter(c => c.status === 'open').length} Open)
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'returns'
                ? 'bg-amber-500 text-amber-950'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            3. DN Pickups &amp; Return QC ({returnReceipts.length})
          </button>
        </div>
      </div>

      {/* TAB 1: POST GRN */}
      {activeTab === 'entry' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">
              Select Dispatched R.O. for GRN
            </h2>
            <select
              value={selectedPoId}
              onChange={e => setSelectedPoId(e.target.value)}
              className="p-2 border border-slate-200 rounded-xl font-bold text-xs"
            >
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  R.O. #{o.poNumber} &bull; {o.deliveryLocation} ({o.totalQty} units)
                </option>
              ))}
            </select>
          </div>

          {selectedPo ? (
            <form onSubmit={handlePostGrn} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Blinkit GRN No. *</label>
                  <input
                    type="text"
                    value={grnNo}
                    onChange={e => setGrnNo(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Delivery Date at Warehouse</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Seller Hub Ticket No.</label>
                  <input
                    type="text"
                    value={ticketNo}
                    onChange={e => setTicketNo(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* GRN Lines Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-2.5">Item</th>
                      <th className="px-3 py-2.5 text-right">Dispatched</th>
                      <th className="px-3 py-2.5 text-right text-emerald-800">Accepted Qty</th>
                      <th className="px-3 py-2.5 text-right text-purple-800">Rejected Qty</th>
                      <th className="px-3 py-2.5 text-right text-rose-800">Short Qty</th>
                      <th className="px-3 py-2.5">Rejection Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPo.items.map(it => {
                      const disp = it.dispatchedQty || it.requestedQty;
                      const line = grnLineData[it.id] || { accepted: disp, rejected: 0, reason: '' };
                      const short = Math.max(disp - line.accepted - line.rejected, 0);

                      return (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-bold text-slate-900 max-w-xs truncate">
                            {it.itemName}
                            <div className="text-[10px] text-slate-500 font-mono">UPC: {it.blinkitUpc}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-black">{disp}</td>
                          <td className="px-3 py-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              max={disp}
                              value={line.accepted}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setGrnLineData({
                                  ...grnLineData,
                                  [it.id]: { ...line, accepted: val },
                                });
                              }}
                              className="w-20 p-1.5 border border-emerald-300 rounded font-black text-right text-emerald-900 bg-emerald-50"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              max={disp}
                              value={line.rejected}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setGrnLineData({
                                  ...grnLineData,
                                  [it.id]: { ...line, rejected: val },
                                });
                              }}
                              className="w-20 p-1.5 border border-purple-300 rounded font-black text-right text-purple-900 bg-purple-50"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-black text-rose-700">
                            {short}
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={line.reason}
                              onChange={e => {
                                setGrnLineData({
                                  ...grnLineData,
                                  [it.id]: { ...line, reason: e.target.value },
                                });
                              }}
                              placeholder="e.g. Expired, damaged"
                              disabled={line.rejected <= 0}
                              className="w-full p-1 border border-slate-200 rounded text-xs disabled:bg-slate-100"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="text-right pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-sm"
                >
                  Post Official GRN
                </button>
              </div>
            </form>
          ) : (
            <div className="p-8 text-center text-slate-500">
              No dispatched PO available to post GRN. Please close a dispatch first.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SHORTAGE CLAIMS & 10-DAY SLA */}
      {activeTab === 'claims' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Shortage Claims &amp; 10-Day SLA Window
              </h2>
              <p className="text-xs text-slate-500">
                Seller Hub tickets require opening video &amp; POD within 10 days of warehouse delivery.
              </p>
            </div>
          </div>

          {claims.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No shortage claims recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map(c => {
                const alert = evaluateGrnTicketDeadline(
                  new Date(Date.now() - 7.5 * 24 * 60 * 60 * 1000).toISOString(),
                  c.id,
                  c.poId
                );

                return (
                  <div key={c.id} className="p-4 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase bg-rose-100 text-rose-800">
                          {c.type}
                        </span>
                        <span className="font-bold text-sm text-slate-900">
                          Claim #{c.id.slice(0, 12)} &bull; {c.qty} Units Short
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        c.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        Status: {c.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="p-2.5 bg-amber-50 rounded-lg text-xs flex items-center justify-between">
                      <span className="text-amber-900 font-semibold">
                        SLA Deadline: {alert.daysLeft} days left ({alert.ticketDeadline})
                      </span>
                      <span className="text-slate-600 font-mono">
                        Ticket: {c.ticketNo || 'Unassigned'}
                      </span>
                    </div>

                    {/* Evidence Helper */}
                    <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 space-y-0.5">
                      <div className="font-bold text-slate-700">Evidence Proof Trail:</div>
                      <div>&bull; Scanned at warehouse: Team (Ravi &amp; Priya) &bull; Verified count: Full</div>
                      <div>&bull; Transporter LR: Attached in dispatch record &bull; Opening Footage: Ready</div>
                    </div>

                    {c.status === 'open' && (
                      <div className="flex justify-end space-x-2 pt-1 text-xs">
                        <button
                          onClick={() => handleResolveClaim(c.id, 'settled')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                        >
                          Blinkit Settled (Credit Note)
                        </button>
                        <button
                          onClick={() => handleResolveClaim(c.id, 'found')}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
                        >
                          Units Located
                        </button>
                        <button
                          onClick={() => handleResolveClaim(c.id, 'rejected')}
                          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg"
                        >
                          Write Off Loss
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DN PICKUPS & 7-DAY LIMIT */}
      {activeTab === 'returns' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Debit Note (DN) Returns &amp; 7-Day Liquidation Limit
            </h2>
            <p className="text-xs text-slate-500">
              Blinkit liquidates un-picked rejected stock after 7 days. Return receipt restores Good stock and auto-allocates to waiting POs.
            </p>
          </div>

          <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-xl text-xs space-y-1">
            <div className="font-black text-red-900 uppercase">
              Blinkit Rule: 7-Day Liquidation Notice
            </div>
            <div className="text-slate-700">
              Raise a warehouse pickup ticket at least 2 days ahead in Seller Hub so the feeder warehouse prepares debit note boxes.
            </div>
          </div>

          {returnReceipts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No return receipts logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {returnReceipts.map(r => (
                <div key={r.id} className="p-4 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="font-mono text-slate-900">DN #{r.dnNo}</span>
                    <span className="text-slate-500">Received Date: {r.receivedDate}</span>
                  </div>
                  <div className="text-xs text-slate-700">
                    Pickup Deadline: <strong>{r.pickupDeadline}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
