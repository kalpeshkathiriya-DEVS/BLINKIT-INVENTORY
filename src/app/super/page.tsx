'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';

interface BusinessItem {
  id: string;
  name: string;
  category: string;
  rawCategory?: string;
  phone: string;
  email: string;
  state: string;
  status: 'pending' | 'active' | 'blocked';
  plan: 'free' | 'pro' | 'business';
  ownerName: string;
  usersCount: number;
  lastActive: string;
  createdAt: string;
}

export default function SuperAdminPage() {
  const { startImpersonation } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newBiz, setNewBiz] = useState({
    name: '',
    category: 'Home & Kitchen',
    phone: '',
    email: '',
    password: '',
    state: 'Gujarat',
    ownerName: '',
    plan: 'pro' as 'free' | 'pro' | 'business',
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function fetchBusinesses() {
    setLoading(true);
    try {
      const res = await fetch('/api/super/businesses');
      const data = await res.json();
      if (res.ok && data.businesses) {
        setBusinesses(data.businesses);
      }
    } catch (err: any) {
      console.error('Error fetching businesses:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function handleUpdateStatus(id: string, action: 'approve' | 'block' | 'unblock') {
    setActionInProgress(id);
    try {
      const res = await fetch('/api/super/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, orgId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: action === 'approve'
            ? 'Business approved and activated! The owner can now sign in.'
            : action === 'block'
            ? 'Business blocked. Platform access has been revoked.'
            : 'Business unblocked and restored to active status.',
        });
        await fetchBusinesses();
      } else {
        setNotification({ type: 'error', message: data.error || 'Action failed.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Request failed.' });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setNotification(null), 5000);
    }
  }

  async function handleCreateBusiness(e: React.FormEvent) {
    e.preventDefault();
    setActionInProgress('creating');
    try {
      const res = await fetch('/api/super/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          businessData: newBiz,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: `Business "${newBiz.name}" created and approved! Login: ${newBiz.email} / ${newBiz.password || 'AdminUser@123'}`,
        });
        setShowAddModal(false);
        setNewBiz({
          name: '',
          category: 'Home & Kitchen',
          phone: '',
          email: '',
          password: '',
          state: 'Gujarat',
          ownerName: '',
          plan: 'pro',
        });
        await fetchBusinesses();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to create business.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setNotification(null), 6000);
    }
  }

  const totalBusinesses = businesses.length;
  const activeBusinesses = businesses.filter(b => b.status === 'active').length;
  const pendingBusinesses = businesses.filter(b => b.status === 'pending').length;
  const totalUsers = businesses.reduce((s, b) => s + (b.usersCount || 1), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-900 flex items-center gap-1">
              <span>⚡</span>
              <span>Platform Super Administrator</span>
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            Platform Multi-Tenant Master Control
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review business registrations, grant approvals, manage subscription quotas, and oversee all active quick-commerce sellers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Create Business Admin</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : 'bg-rose-50 text-rose-900 border-rose-200'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 font-black ml-4">✕</button>
        </div>
      )}

      {/* Real Platform Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Businesses</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalBusinesses}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase">Active Businesses</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{activeBusinesses}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-amber-700 uppercase">Pending Review</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{pendingBusinesses}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-purple-700 uppercase">Platform Users</div>
          <div className="text-2xl font-black text-purple-700 mt-1">{totalUsers}</div>
        </div>
      </div>

      {/* Businesses Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">
            Quick-Commerce Seller Organizations ({businesses.length})
          </h2>
          <button
            onClick={fetchBusinesses}
            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
          >
            <span>🔄</span>
            <span>Refresh List</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Business &amp; Owner</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Plan Tier</th>
                <th className="px-5 py-3">Approval Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {businesses.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900">{b.name}</div>
                    <div className="text-slate-500 text-[11px]">
                      Owner: {b.ownerName} &bull; {b.state}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {b.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-slate-900 font-medium">{b.email}</div>
                    <div className="text-slate-500 text-[11px] font-mono">{b.phone}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      b.plan === 'business'
                        ? 'bg-purple-100 text-purple-900'
                        : b.plan === 'pro'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {b.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      b.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                    {/* View As Business (Impersonate) */}
                    <button
                      onClick={() => startImpersonation(b.id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                      title="Inspect this business in read-only mode"
                    >
                      👁️ View As
                    </button>

                    {b.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(b.id, 'approve')}
                        disabled={actionInProgress === b.id}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors disabled:opacity-50"
                      >
                        {actionInProgress === b.id ? 'Approving…' : '✓ Approve'}
                      </button>
                    )}

                    {b.status === 'active' && (
                      <button
                        onClick={() => handleUpdateStatus(b.id, 'block')}
                        disabled={actionInProgress === b.id}
                        className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
                      >
                        Block
                      </button>
                    )}

                    {b.status === 'blocked' && (
                      <button
                        onClick={() => handleUpdateStatus(b.id, 'unblock')}
                        disabled={actionInProgress === b.id}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
                      >
                        Unblock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {businesses.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No businesses registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Plans & Limits */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-black text-slate-900">Subscription Plans &amp; Resource Quotas</h2>
          <p className="text-xs text-slate-500 mt-0.5">Enforced across staff accounts, product masters, and R.O. monthly import volumes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-900 text-sm">Free Tier</span>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-bold text-[10px]">₹0 / mo</span>
            </div>
            <ul className="space-y-1 text-slate-600 font-medium">
              <li>&bull; Up to <strong>5 Staff Accounts</strong></li>
              <li>&bull; Up to <strong>100 Products Master</strong></li>
              <li>&bull; <strong>20 POs / month</strong> limit</li>
              <li>&bull; Blinkit Excel &amp; PDF Importer</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-blue-900 text-sm">Pro Tier</span>
              <span className="px-2 py-0.5 bg-blue-200 text-blue-900 rounded font-bold text-[10px]">₹999 / mo</span>
            </div>
            <ul className="space-y-1 text-slate-600 font-medium">
              <li>&bull; Up to <strong>20 Staff Accounts</strong></li>
              <li>&bull; Up to <strong>1,000 Products Master</strong></li>
              <li>&bull; <strong>200 POs / month</strong> limit</li>
              <li>&bull; Code128 Barcode Generator + 11 Reports</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-purple-900 text-sm">Business Tier</span>
              <span className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded font-bold text-[10px]">₹2,999 / mo</span>
            </div>
            <ul className="space-y-1 text-slate-600 font-medium">
              <li>&bull; Up to <strong>100 Staff Accounts</strong></li>
              <li>&bull; Up to <strong>10,000 Products Master</strong></li>
              <li>&bull; <strong>2,000 POs / month</strong> limit</li>
              <li>&bull; Priority SLA Support &amp; Audit Trail</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Manual Business Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-sm">Provision Business &amp; Admin</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={newBiz.name}
                  onChange={e => setNewBiz({ ...newBiz, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-semibold"
                  placeholder="e.g. Adify Essentials Pvt Ltd"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={newBiz.ownerName}
                  onChange={e => setNewBiz({ ...newBiz, ownerName: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-semibold"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newBiz.category}
                    onChange={e => setNewBiz({ ...newBiz, category: e.target.value as any })}
                    className="w-full p-2.5 border rounded-xl font-semibold bg-white"
                  >
                    <option value="Home & Kitchen">Home &amp; Kitchen</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plan Tier</label>
                  <select
                    value={newBiz.plan}
                    onChange={e => setNewBiz({ ...newBiz, plan: e.target.value as any })}
                    className="w-full p-2.5 border rounded-xl font-semibold bg-white"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro (Standard)</option>
                    <option value="business">Business</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={newBiz.email}
                    onChange={e => setNewBiz({ ...newBiz, email: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-semibold"
                    placeholder="admin@business.com"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="text"
                    value={newBiz.password}
                    onChange={e => setNewBiz({ ...newBiz, password: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-semibold"
                    placeholder="AdminUser@123"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={newBiz.phone}
                  onChange={e => setNewBiz({ ...newBiz, phone: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-semibold"
                  placeholder="9879012345"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress === 'creating'}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-black shadow-sm disabled:opacity-50"
                >
                  {actionInProgress === 'creating' ? 'Creating…' : 'Create & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
