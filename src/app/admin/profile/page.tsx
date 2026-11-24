'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getInventoryStore, Organization } from '../../../lib/store/inventory-store';

export default function AdminProfilePage() {
  const store = getInventoryStore();
  const [org, setOrg] = useState<Organization | null>(null);
  const [hideRates, setHideRates] = useState<boolean>(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    const current = store.getCurrentOrg();
    setOrg(current);
    setHideRates(!!current.hideRatesFromStaff);
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (org) {
      org.hideRatesFromStaff = hideRates;
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-xs text-slate-500 hover:text-emerald-600 font-bold">
            ← Admin Hub
          </Link>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>⚙️</span>
            <span>Business Profile &amp; Organization Settings</span>
          </h1>
        </div>
      </div>

      {savedMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">
          ✓ Organization settings saved successfully.
        </div>
      )}

      {/* Business Details Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-black text-slate-900">Organization Profile</h2>
          <p className="text-xs text-slate-500">Business registration details submitted to platform</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Business Name</label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900">
              {org?.name || 'Apex Home Essentials Pvt Ltd'}
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Business Category</label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900">
              {org?.category || 'Home & Kitchen'}
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">GSTIN Number</label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900">
              {org?.gstin || '24AAACA9876Q1Z5'}
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Registered State</label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900">
              {org?.state || 'Gujarat'}
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Official Email</label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900">
              {org?.email || 'admin@apexessentials.in'}
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Phone Number</label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900">
              {org?.phone || '+91 98790 33445'}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plan Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Subscription &amp; Quota Allocation</h2>
            <p className="text-xs text-slate-500">Your current plan allocation and operational limits</p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full font-black text-xs uppercase">
            {org?.plan || 'Pro'} Tier
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-semibold text-slate-500">Max Staff Accounts</div>
            <div className="text-xl font-black text-slate-900 mt-1">20 Users</div>
            <div className="text-[11px] text-emerald-700 mt-1">Active: {store.staffProfiles.length} users</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-semibold text-slate-500">Max Active Products</div>
            <div className="text-xl font-black text-slate-900 mt-1">1,000 SKUs</div>
            <div className="text-[11px] text-emerald-700 mt-1">Active: {store.products.length} SKUs</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-semibold text-slate-500">POs Monthly Limit</div>
            <div className="text-xl font-black text-slate-900 mt-1">200 POs / mo</div>
            <div className="text-[11px] text-emerald-700 mt-1">Unlimited Excel &amp; PDF imports</div>
          </div>
        </div>
      </div>

      {/* Staff Permissions & Privacy Settings (PRD 04) */}
      <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-black text-slate-900">Staff Permissions &amp; Data Security</h2>
          <p className="text-xs text-slate-500">Control what information warehouse staff can see</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-4">
          <input
            type="checkbox"
            id="hideRates"
            checked={hideRates}
            onChange={e => setHideRates(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
          />
          <div>
            <label htmlFor="hideRates" className="font-bold text-slate-900 text-xs cursor-pointer">
              Hide Purchase Rates &amp; Commercial Values from Staff
            </label>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              When enabled, staff scanning on mobile devices and recording inward bills will not see purchase rates, supplier rates, or gross margins.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
