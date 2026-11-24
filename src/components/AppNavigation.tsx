'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

export default function AppNavigation() {
  const pathname = usePathname();
  const { user, loginAs, logout, impersonatingOrg, stopImpersonation } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  // If on login, register or pending pages, show simplified header
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/pending');

  if (isAuthPage) {
    return (
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/login" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center font-black text-emerald-950 text-base shadow-inner">
              B
            </div>
            <span className="text-base font-black tracking-tight text-slate-900">
              Blinkit<span className="text-emerald-600">Ops</span>
            </span>
          </Link>

          <div className="flex items-center space-x-3 text-xs font-bold">
            <Link href="/login" className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-emerald-700">
              Sign In
            </Link>
            <Link href="/register" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm">
              Register Business
            </Link>
          </div>
        </div>
      </header>
    );
  }

  const role = user?.role || 'admin';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      {/* SuperAdmin Impersonation Banner */}
      {impersonatingOrg && (
        <div className="bg-purple-900 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <span>👁️</span>
            <span>
              SUPERADMIN VIEW-AS: Viewing <strong>{impersonatingOrg.name}</strong> ({impersonatingOrg.category})
            </span>
          </div>
          <button
            onClick={stopImpersonation}
            className="px-2.5 py-0.5 bg-white text-purple-900 hover:bg-purple-100 rounded text-[11px] font-black"
          >
            Exit Impersonation ✕
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Org Info */}
          <div className="flex items-center space-x-3">
            <Link href={role === 'superadmin' ? '/super' : role === 'user' ? '/scan' : '/admin'} className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center font-black text-emerald-950 text-xl shadow-inner">
                B
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold tracking-tight text-slate-900">
                    Blinkit<span className="text-emerald-600">Ops</span>
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${
                    role === 'superadmin'
                      ? 'bg-purple-100 text-purple-900'
                      : role === 'user'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    {role === 'superadmin' ? 'SuperAdmin' : role === 'user' ? 'Staff' : 'Admin'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  {role === 'superadmin'
                    ? 'Platform Central Control'
                    : role === 'user'
                    ? `Staff: ${user?.name || 'Ravi Kumar'}`
                    : user?.orgName || 'Apex Home Essentials'}
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links based on Active Role */}
          <nav className="hidden md:flex space-x-1 lg:space-x-1.5 text-xs font-bold">
            {/* SUPERADMIN NAV */}
            {role === 'superadmin' && (
              <>
                <Link
                  href="/super"
                  className={`px-3 py-2 rounded-xl transition-colors ${
                    pathname === '/super'
                      ? 'bg-purple-100 text-purple-900 font-black'
                      : 'text-slate-700 hover:text-purple-900 hover:bg-slate-100'
                  }`}
                >
                  ⚡ Businesses &amp; Approvals
                </Link>
                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-xl transition-colors ${
                    pathname === '/admin'
                      ? 'bg-slate-200 text-slate-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  🏢 Admin Hub
                </Link>
                <Link
                  href="/reports/audit-log"
                  className={`px-3 py-2 rounded-xl transition-colors ${
                    pathname === '/reports/audit-log'
                      ? 'bg-slate-200 text-slate-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  🔍 System Audit Log
                </Link>
              </>
            )}

            {/* BUSINESS ADMIN NAV */}
            {role === 'admin' && (
              <>
                <Link
                  href="/admin"
                  className={`px-2.5 py-2 rounded-xl transition-colors ${
                    pathname === '/admin'
                      ? 'bg-emerald-100 text-emerald-900 font-black'
                      : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-100'
                  }`}
                >
                  Admin Hub
                </Link>
                <Link
                  href="/ro-import"
                  className={`px-2.5 py-2 rounded-xl transition-colors ${
                    pathname === '/ro-import'
                      ? 'bg-amber-100 text-amber-900 font-black'
                      : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  ⚡ Import R.O.
                </Link>
                <Link
                  href="/pos"
                  className={`px-2.5 py-2 rounded-xl transition-colors ${
                    pathname.startsWith('/pos')
                      ? 'bg-emerald-100 text-emerald-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Orders
                </Link>
                <Link
                  href="/scan"
                  className={`px-2.5 py-2 rounded-xl transition-colors ${
                    pathname === '/scan'
                      ? 'bg-emerald-100 text-emerald-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Team Scan
                </Link>
                <Link
                  href="/stock"
                  className={`px-2.5 py-2 rounded-xl transition-colors ${
                    pathname === '/stock'
                      ? 'bg-emerald-100 text-emerald-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Stock
                </Link>
                <Link
                  href="/inwards"
                  className={`px-2.5 py-2 rounded-xl transition-colors ${
                    pathname === '/inwards'
                      ? 'bg-emerald-100 text-emerald-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Inwards
                </Link>
                <Link
                  href="/grn-claims"
                  className={`px-2.5 py-2 rounded-xl transition-colors ${
                    pathname === '/grn-claims'
                      ? 'bg-emerald-100 text-emerald-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  GRN &amp; Claims
                </Link>
                <Link
                  href="/products"
                  className={`px-2.5 py-2 rounded-xl transition-colors ${
                    pathname === '/products'
                      ? 'bg-emerald-100 text-emerald-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Products
                </Link>
                <Link
                  href="/staff"
                  className={`px-2.5 py-2 rounded-xl transition-colors ${
                    pathname === '/staff'
                      ? 'bg-emerald-100 text-emerald-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Staff
                </Link>
                <Link
                  href="/reports"
                  className={`px-2.5 py-2 rounded-xl transition-colors ${
                    pathname.startsWith('/reports')
                      ? 'bg-emerald-100 text-emerald-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  📊 Reports
                </Link>
              </>
            )}

            {/* STAFF USER NAV */}
            {role === 'user' && (
              <>
                <Link
                  href="/scan"
                  className={`px-4 py-2 rounded-xl transition-colors ${
                    pathname === '/scan'
                      ? 'bg-emerald-600 text-white font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  📱 Mobile Team Scan
                </Link>
                <Link
                  href="/inwards"
                  className={`px-4 py-2 rounded-xl transition-colors ${
                    pathname === '/inwards'
                      ? 'bg-emerald-100 text-emerald-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  🧾 Inward Receiving
                </Link>
                <Link
                  href="/grn-claims"
                  className={`px-4 py-2 rounded-xl transition-colors ${
                    pathname === '/grn-claims'
                      ? 'bg-emerald-100 text-emerald-900 font-black'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ↩️ Return Delivery Checks
                </Link>
              </>
            )}
          </nav>

          {/* User Profile & Role Switcher */}
          <div className="flex items-center space-x-2 relative">
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                title="Switch active session role"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                  role === 'superadmin'
                    ? 'bg-purple-200 text-purple-900'
                    : role === 'user'
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {role === 'superadmin' ? 'SA' : role === 'user' ? 'RK' : 'AU'}
                </div>
                <div className="text-left hidden sm:block pr-1">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                    {user?.name || 'Logged In'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">
                    Role: {role}
                  </div>
                </div>
                <span className="text-slate-400 text-xs">▼</span>
              </button>

              {/* User Profile & Sign Out Menu */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 text-xs">
                  <div className="px-4 pb-2.5 border-b border-slate-100">
                    <div className="font-black text-slate-900 text-sm">{user?.name || 'User'}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{user?.email || user?.phone || 'Authenticated'}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        role === 'superadmin'
                          ? 'bg-purple-100 text-purple-900'
                          : role === 'user'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {role === 'superadmin' ? '👑 Platform SuperAdmin' : role === 'user' ? '📱 Floor Staff' : '🏢 Business Admin'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 px-2 space-y-1">
                    {role === 'admin' && (
                      <Link
                        href="/admin/profile"
                        onClick={() => setShowRoleMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-bold transition-colors"
                      >
                        <span>⚙️</span>
                        <span>Business Settings</span>
                      </Link>
                    )}
                    {role === 'superadmin' && (
                      <Link
                        href="/super"
                        onClick={() => setShowRoleMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-purple-900 hover:bg-purple-50 font-bold transition-colors"
                      >
                        <span>⚡</span>
                        <span>SuperAdmin Panel</span>
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors text-left"
                    >
                      <span>🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden flex border-t border-slate-200 bg-white overflow-x-auto py-1 px-2 space-x-1 text-xs font-semibold">
        {role === 'superadmin' ? (
          <>
            <Link href="/super" className="px-2 py-1.5 text-purple-900 font-black whitespace-nowrap">⚡ Approvals</Link>
            <Link href="/admin" className="px-2 py-1.5 text-slate-700 whitespace-nowrap">Admin Hub</Link>
            <Link href="/reports/audit-log" className="px-2 py-1.5 text-slate-700 whitespace-nowrap">Audit Log</Link>
          </>
        ) : role === 'user' ? (
          <>
            <Link href="/scan" className="px-3 py-1.5 text-emerald-800 font-black whitespace-nowrap">📱 Scan</Link>
            <Link href="/inwards" className="px-3 py-1.5 text-slate-700 whitespace-nowrap">Inward</Link>
            <Link href="/grn-claims" className="px-3 py-1.5 text-slate-700 whitespace-nowrap">Returns QC</Link>
          </>
        ) : (
          <>
            <Link href="/admin" className="px-2 py-1.5 text-emerald-800 font-black whitespace-nowrap">Admin</Link>
            <Link href="/ro-import" className="px-2 py-1.5 text-amber-700 font-bold whitespace-nowrap">Import</Link>
            <Link href="/pos" className="px-2 py-1.5 text-slate-700 whitespace-nowrap">POs</Link>
            <Link href="/scan" className="px-2 py-1.5 text-emerald-700 font-bold whitespace-nowrap">Scan</Link>
            <Link href="/stock" className="px-2 py-1.5 text-slate-700 whitespace-nowrap">Stock</Link>
            <Link href="/inwards" className="px-2 py-1.5 text-slate-700 whitespace-nowrap">Inward</Link>
            <Link href="/grn-claims" className="px-2 py-1.5 text-slate-700 whitespace-nowrap">GRN</Link>
            <Link href="/products" className="px-2 py-1.5 text-slate-700 whitespace-nowrap">Products</Link>
            <Link href="/staff" className="px-2 py-1.5 text-slate-700 whitespace-nowrap">Staff</Link>
            <Link href="/reports" className="px-2 py-1.5 text-emerald-700 font-bold whitespace-nowrap">Reports</Link>
          </>
        )}
      </div>
    </header>
  );
}
