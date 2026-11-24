'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore, StockSummaryItem, StockMovement } from '../../../lib/store/inventory-store';
import { exportToExcel } from '../../../lib/excel-export';

export default function LowStockReportPage() {
  const store = getInventoryStore();
  const [activeTab, setActiveTab] = useState<'low_stock' | 'dead_stock'>('low_stock');
  const [reorderThreshold, setReorderThreshold] = useState<number>(80);
  const [deadDaysThreshold, setDeadDaysThreshold] = useState<number>(60);

  const [stock, setStock] = useState<StockSummaryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    setStock(store.getStockSummary());
    setMovements([...store.stockMovements]);
  }, []);

  const now = Date.now();

  // 1. Low stock items
  const lowStockItems = stock.filter(item => item.available <= reorderThreshold || item.available <= 0).map(item => {
    const suggestedReorder = Math.max(reorderThreshold * 2 - item.available, 0);
    const estCost = suggestedReorder * (item.mrp * 0.4); // approx purchase rate 40% of MRP
    const isOutOfStock = item.available <= 0;
    const isDeficit = item.reserved > item.good;

    return {
      ...item,
      suggestedReorder,
      estCost,
      status: isDeficit ? 'RESERVED_DEFICIT' : isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK',
    };
  });

  // 2. Dead stock items (no dispatch or movement in X days)
  const deadStockItems = stock.filter(item => {
    if (item.good <= 0) return false;
    const itemMovements = movements.filter(m => m.productId === item.productId);
    if (itemMovements.length === 0) return true;

    // Latest movement
    const latestTime = Math.max(...itemMovements.map(m => new Date(m.createdAt).getTime()));
    const daysSince = Math.floor((now - latestTime) / (1000 * 60 * 60 * 24));
    return daysSince >= deadDaysThreshold;
  }).map(item => {
    const itemMovements = movements.filter(m => m.productId === item.productId);
    const latestTime = itemMovements.length > 0 ? Math.max(...itemMovements.map(m => new Date(m.createdAt).getTime())) : 0;
    const daysInactive = latestTime > 0 ? Math.floor((now - latestTime) / (1000 * 60 * 60 * 24)) : 999;
    const lockedCapital = item.good * item.mrp;

    return {
      ...item,
      daysInactive,
      lockedCapital,
      recommendedAction: daysInactive > 90 ? 'Liquidate / Heavy Discount' : 'Bundle Promotion',
    };
  });

  // KPI calculations
  const totalLowStockSkus = lowStockItems.length;
  const totalReorderCapitalNeeded = lowStockItems.reduce((s, i) => s + i.estCost, 0);
  const totalDeadCapitalLocked = deadStockItems.reduce((s, i) => s + i.lockedCapital, 0);

  const handleExport = () => {
    if (activeTab === 'low_stock') {
      const exportData = lowStockItems.map(i => ({
        Product: i.officialName,
        SKU: i.sku,
        UPC: i.upc,
        AvailableATP: i.available,
        Reserved: i.reserved,
        GoodStock: i.good,
        SuggestedReorder: i.suggestedReorder,
        EstimatedCapital: Math.round(i.estCost),
        Status: i.status,
      }));
      exportToExcel(exportData, `Low_Stock_Report_${new Date().toISOString().split('T')[0]}`, 'Low Stock');
    } else {
      const exportData = deadStockItems.map(i => ({
        Product: i.officialName,
        SKU: i.sku,
        GoodStock: i.good,
        MRP: i.mrp,
        LockedCapital: i.lockedCapital,
        DaysInactive: i.daysInactive,
        RecommendedAction: i.recommendedAction,
      }));
      exportToExcel(exportData, `Dead_Stock_Report_${new Date().toISOString().split('T')[0]}`, 'Dead Stock');
    }
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
            <span>🚨</span>
            <span>Low Stock &amp; Dead Stock Intelligence</span>
          </h1>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
        >
          Export Excel
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('low_stock')}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all ${
            activeTab === 'low_stock'
              ? 'border-rose-600 text-rose-700 bg-rose-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          🚨 Low Stock &amp; Reorder Alerts ({lowStockItems.length})
        </button>
        <button
          onClick={() => setActiveTab('dead_stock')}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all ${
            activeTab === 'dead_stock'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          🧊 Dead Stock (No Movement 60/90 Days) ({deadStockItems.length})
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-rose-700 uppercase">SKUs Needing Reorder</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{totalLowStockSkus} SKUs</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Est. Reorder Capital Needed</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{Math.round(totalReorderCapitalNeeded).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-amber-700 uppercase">Capital Tied in Dead Stock</div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            ₹{Math.round(totalDeadCapitalLocked).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* TAB 1: LOW STOCK */}
      {activeTab === 'low_stock' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Reorder Alert Threshold:</span>
            <div className="flex items-center gap-2">
              {[30, 50, 80, 100].map(val => (
                <button
                  key={val}
                  onClick={() => setReorderThreshold(val)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    reorderThreshold === val
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  &lt; {val} units
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Products Requiring Urgent Purchase Orders
              </h2>
              <Link href="/inwards" className="text-xs font-bold text-emerald-600 hover:underline">
                + Create Inward Receiving →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Product / SKU</th>
                    <th className="px-4 py-3 text-right">Good Stock</th>
                    <th className="px-4 py-3 text-right">Reserved</th>
                    <th className="px-4 py-3 text-right text-rose-700">Available ATP</th>
                    <th className="px-4 py-3 text-right font-black">Suggested Reorder</th>
                    <th className="px-4 py-3 text-right">Est. Cost</th>
                    <th className="px-4 py-3 text-center">Severity</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockItems.map(item => (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.officialName}</div>
                        <div className="text-[11px] font-mono text-slate-500">SKU: {item.sku} &bull; UPC: {item.upc}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{item.good}</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-700">{item.reserved}</td>
                      <td className="px-4 py-3 text-right font-black text-rose-700 text-sm">
                        {item.available}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        {item.suggestedReorder} units
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        ₹{Math.round(item.estCost).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.status === 'RESERVED_DEFICIT'
                            ? 'bg-purple-100 text-purple-800'
                            : item.status === 'OUT_OF_STOCK'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href="/inwards"
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold text-[11px]"
                        >
                          Inward →
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {lowStockItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                        All products are healthy and above the reorder threshold!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEAD STOCK */}
      {activeTab === 'dead_stock' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Inactivity Period:</span>
            <div className="flex items-center gap-2">
              {[30, 60, 90].map(days => (
                <button
                  key={days}
                  onClick={() => setDeadDaysThreshold(days)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    deadDaysThreshold === days
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  &gt; {days} Days No Movement
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Slow Moving &amp; Non-Moving Inventory (Tied Up Working Capital)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Product / SKU</th>
                    <th className="px-4 py-3 text-right">Units on Hand</th>
                    <th className="px-4 py-3 text-right">MRP</th>
                    <th className="px-4 py-3 text-right font-black text-amber-700">Capital Locked</th>
                    <th className="px-4 py-3 text-right">Days Inactive</th>
                    <th className="px-4 py-3">Suggested Channel Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deadStockItems.map(item => (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.officialName}</div>
                        <div className="text-[11px] font-mono text-slate-500">SKU: {item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-black">{item.good}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹{item.mrp}</td>
                      <td className="px-4 py-3 text-right font-black text-amber-700">
                        ₹{Math.round(item.lockedCapital).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-600">
                        {item.daysInactive > 900 ? 'No Dispatches' : `${item.daysInactive} days`}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                          {item.recommendedAction}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {deadStockItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No dead stock detected for this timeframe!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
