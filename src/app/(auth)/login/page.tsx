'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth, UserRole } from '../../../lib/auth-context';

type Tab = 'admin' | 'staff' | 'superadmin';

const ERROR_MESSAGES: Record<string, string> = {
  inactive: 'Account is inactive. Please contact your platform administrator.',
  blocked: 'Your business account has been suspended. Please contact platform support.',
  pending: 'Your business registration is pending approval. Please check back shortly.',
  unauthorized: 'You do not have access permission for that module.',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginAs } = useAuth();

  const [tab, setTab] = useState<Tab>('admin');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-key'
  );

  useEffect(() => {
    const err = searchParams.get('error');
    if (err && ERROR_MESSAGES[err]) setError(ERROR_MESSAGES[err]);
  }, [searchParams]);

  // Handle Business Admin & SuperAdmin Login
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) {
        setError(authErr.message || 'Invalid email or password.');
        return;
      }

      if (!data.user) {
        setError('Authentication failed. No user record found.');
        return;
      }

      // Query user profile & organization status
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role, is_active, org_id, full_name, organizations(status, name)')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileErr || !profile) {
        // Fallback for superadmin or freshly seeded admin
        if (email === 'superadmin@blinkitops.com') {
          loginAs('superadmin', { name: 'Super Administrator' });
          router.push('/super');
          return;
        }
        setError('User profile not found in database.');
        return;
      }

      if (profile.role !== 'superadmin' && !profile.is_active) {
        await supabase.auth.signOut();
        setError(ERROR_MESSAGES.inactive);
        return;
      }

      const org = profile.organizations as unknown as { status: string; name: string } | null;
      if (profile.role !== 'superadmin' && org?.status === 'pending') {
        localStorage.setItem('pending_business_name', org.name || 'Your Business');
        localStorage.setItem('pending_org_id', profile.org_id || '');
        router.push('/pending');
        return;
      }

      if (profile.role !== 'superadmin' && org?.status === 'blocked') {
        await supabase.auth.signOut();
        setError(ERROR_MESSAGES.blocked);
        return;
      }

      // Successful login
      const targetRole = (profile.role as UserRole) || (tab === 'superadmin' ? 'superadmin' : 'admin');
      loginAs(targetRole, {
        name: profile.full_name || data.user.email?.split('@')[0],
        orgId: profile.org_id,
      });

      if (targetRole === 'superadmin') {
        router.push('/super');
      } else {
        router.push('/admin');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Staff Mobile Phone + PIN Login
  async function handleStaffLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid phone or PIN.');
        return;
      }

      loginAs('user', {
        name: data.user.name,
        phone: data.user.phone,
        orgId: data.user.orgId,
      });

      router.push('/scan');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Staff login request failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-400 shadow-lg mb-3">
            <span className="text-3xl font-black text-emerald-950">B</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Blinkit<span className="text-emerald-600">Ops</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Multi-Business Quick-Commerce Inventory OS</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Role Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 text-xs font-black">
            <button
              onClick={() => { setTab('admin'); setError(''); }}
              className={`flex-1 py-3.5 text-center transition-all ${tab === 'admin'
                  ? 'bg-white text-emerald-800 border-b-2 border-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              🏢 Business Admin
            </button>
            <button
              onClick={() => { setTab('staff'); setError(''); }}
              className={`flex-1 py-3.5 text-center transition-all ${tab === 'staff'
                  ? 'bg-white text-emerald-800 border-b-2 border-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              📱 Staff (PIN)
            </button>
            <button
              onClick={() => { setTab('superadmin'); setError(''); }}
              className={`flex-1 py-3.5 text-center transition-all ${tab === 'superadmin'
                  ? 'bg-white text-purple-900 border-b-2 border-purple-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              👑 SuperAdmin
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: BUSINESS ADMIN */}
            {tab === 'admin' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business Admin Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="admin@apexessentials.in"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors shadow-sm disabled:opacity-60"
                >
                  {loading ? 'Authenticating…' : 'Sign In as Business Admin →'}
                </button>
              </form>
            )}

            {/* TAB 2: STAFF (PHONE + PIN) */}
            {tab === 'staff' && (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registered Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="9876543210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Staff Security PIN (4–6 digits)</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    minLength={4}
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-black tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors shadow-sm disabled:opacity-60"
                >
                  {loading ? 'Verifying PIN…' : 'Sign In to Mobile Scanner →'}
                </button>
              </form>
            )}

            {/* TAB 3: SUPER ADMIN */}
            {tab === 'superadmin' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">Platform SuperAdmin Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-purple-200 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="superadmin@blinkitops.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">SuperAdmin Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-purple-200 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl text-xs transition-colors shadow-sm disabled:opacity-60"
                >
                  {loading ? 'Authenticating…' : 'Enter SuperAdmin Portal (/super) →'}
                </button>
              </form>
            )}

            {/* Reference Credentials Toggle */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCredentials(!showCredentials)}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 w-full text-center flex items-center justify-center gap-1"
              >
                <span>🔑</span>
                <span>{showCredentials ? 'Hide Standard Access Credentials' : 'View Standard Access Credentials'}</span>
              </button>

              {showCredentials && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-2 text-slate-600">
                  <div>
                    <div className="font-bold text-purple-900">👑 Platform SuperAdmin:</div>
                    <div className="font-mono text-[10px] text-slate-800">superadmin@blinkitops.com / SuperAdmin@123</div>
                  </div>
                  <div>
                    <div className="font-bold text-emerald-900">🏢 Apex Business Admin:</div>
                    <div className="font-mono text-[10px] text-slate-800">admin@apexessentials.in / AdminUser@123</div>
                  </div>
                  <div>
                    <div className="font-bold text-amber-900">📱 Floor Staff User:</div>
                    <div className="font-mono text-[10px] text-slate-800">Phone: 9876543210 / PIN: 1234</div>
                  </div>
                </div>
              )}
            </div>

            {/* Register Link */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                New quick-commerce seller?{' '}
                <Link href="/register" className="text-emerald-700 hover:underline font-black">
                  Register Business Here →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-semibold text-sm">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
