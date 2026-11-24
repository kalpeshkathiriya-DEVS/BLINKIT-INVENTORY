'use client';

import Link from 'next/link';

const reports = [
  { href: '/reports/stock', icon: '📦', title: 'Stock Report', desc: 'Current stock across all buckets with valuation' },
  { href: '/reports/purchases', icon: '🧾', title: 'Purchase Register', desc: 'Bill-wise inward purchase entries with GST breakup' },
  { href: '/reports/supplier-damage', icon: '⚠️', title: 'Supplier Damage Report', desc: 'Damaged stock received from suppliers' },
  { href: '/reports/po-fulfilment', icon: '📋', title: 'PO Fulfilment', desc: 'PO-wise fill rate and dispatch performance' },
  { href: '/reports/grn', icon: '✅', title: 'GRN Report', desc: 'GRN entries with shortages and ticket deadlines' },
  { href: '/reports/claims', icon: '💰', title: 'Claims Report', desc: 'Open, settled and rejected shortage/rejection claims' },
  { href: '/reports/returns', icon: '↩️', title: 'Returns Report', desc: 'DN-wise return receipts and recovery analysis' },
  { href: '/reports/staff', icon: '👥', title: 'Staff Report', desc: 'Scan productivity and activity by staff member' },
  { href: '/reports/stock-ledger', icon: '📒', title: 'Stock Ledger', desc: 'Per-product movement history with running balance' },
  { href: '/reports/audit-log', icon: '🔍', title: 'Audit Log', desc: 'All system events and user actions' },
  { href: '/reports/low-stock', icon: '🚨', title: 'Low Stock & Dead Stock', desc: 'Products below reorder level or with no movement' },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">📊 Reports Hub</h1>
        <p className="text-sm text-slate-500 mt-1">Export and analyse inventory data across all modules</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-emerald-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl shrink-0">{r.icon}</div>
              <div>
                <h2 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {r.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{r.desc}</p>
              </div>
            </div>
            <div className="mt-3 text-xs font-semibold text-emerald-600 group-hover:underline">
              View Report →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
