'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth-context';

export default function PendingPage() {
  const router = useRouter();
  const { logout, loginAs } = useAuth();
  const [bizName, setBizName] = useState('Your Business');
  const [ownerName, setOwnerName] = useState('Business Owner');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const savedBiz = localStorage.getItem('pending_business_name');
    const savedOwner = localStorage.getItem('pending_owner_name');
    const savedOrgId = localStorage.getItem('pending_org_id');

    if (savedBiz) setBizName(savedBiz);
    if (savedOwner) setOwnerName(savedOwner);
    if (savedOrgId) setOrgId(savedOrgId);
  }, []);

  async function checkStatus(isAuto = false) {
    if (!isAuto) setChecking(true);
    setStatusMessage(null);

    try {
      const savedBiz = localStorage.getItem('pending_business_name') || bizName;
      const savedOrgId = localStorage.getItem('pending_org_id') || orgId;

      const url = savedOrgId
        ? `/api/auth/status?orgId=${encodeURIComponent(savedOrgId)}`
        : `/api/auth/status?businessName=${encodeURIComponent(savedBiz)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.status === 'active') {
        setIsApproved(true);
        setStatusMessage('Your business registration has been approved! Redirecting to dashboard…');
        setTimeout(() => {
          loginAs('admin', { name: ownerName, orgId: data.orgId || savedOrgId });
          router.push('/admin');
        }, 1500);
      } else if (!isAuto) {
        setStatusMessage('Your application is still under review. Please check back shortly.');
      }
    } catch {
      if (!isAuto) {
        setStatusMessage('Unable to connect to platform server. Please retry in a few moments.');
      }
    } finally {
      if (!isAuto) setChecking(false);
    }
  }

  // Periodic polling every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkStatus(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [bizName, orgId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Brand */}
        <div>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-400 shadow-xl mb-3">
            <span className="text-3xl font-black text-emerald-950">B</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Blinkit<span className="text-emerald-600">Ops</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">Quick-Commerce Inventory Operating System</p>
        </div>

        {/* Status card */}
        <div className="p-8 bg-white rounded-3xl shadow-xl border border-slate-200 text-left space-y-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
              ⏳
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                Application Under Review
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1">{bizName}</h2>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Thank you for registering with BlinkitOps. Your business account has been submitted and is currently pending verification. Once platform approval is completed, you will receive full access to your business inventory dashboard.
          </p>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2.5">
            <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              Onboarding Progress
            </div>
            <div className="space-y-2 text-slate-600 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">✓</span>
                <span className="font-semibold text-slate-800">Business registration profile submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">⏳</span>
                <span className="font-semibold text-amber-900">Administrator review &amp; verification</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold">3</span>
                <span className="text-slate-400">Dashboard activation &amp; staff provisioning</span>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs font-bold ${
              isApproved
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {statusMessage}
            </div>
          )}

          {/* Real action */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <button
              onClick={() => checkStatus(false)}
              disabled={checking || isApproved}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>{checking ? '🔄' : '🔍'}</span>
              <span>{checking ? 'Checking Status…' : 'Check Approval Status'}</span>
            </button>

            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
