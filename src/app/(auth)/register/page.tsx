'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { getInventoryStore } from '../../../lib/store/inventory-store'

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh',
  'Lakshadweep','Puducherry',
]

const CATEGORIES = ['Home & Kitchen','Clothing','Manufacturing','Other']

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    category: '',
    gstin: '',
    state: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      // 1. Register with server API (Supabase)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: form.businessName,
          ownerName: form.ownerName,
          phone: form.phone,
          email: form.email,
          password: form.password,
          category: form.category,
          gstin: form.gstin,
          state: form.state,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed. Please try again.')
      }

      // 2. Persist registration info locally
      localStorage.setItem('pending_business_name', form.businessName)
      localStorage.setItem('pending_owner_name', form.ownerName)
      if (data.orgId) {
        localStorage.setItem('pending_org_id', data.orgId)
      }

      // Also register in local inventory store for client session
      const store = getInventoryStore()
      store.registerOrganization({
        businessName: form.businessName,
        ownerName: form.ownerName,
        phone: form.phone,
        email: form.email,
        category: form.category as any,
        gstin: form.gstin,
        state: form.state,
      })

      router.push('/pending')
    } catch (err: any) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400 shadow-lg mb-3">
            <span className="text-2xl font-black text-emerald-950">B</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Register your Business
          </h1>
          <p className="text-sm text-slate-500 mt-1">Get started with BlinkitOps</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name *</label>
                <input required value={form.businessName} onChange={(e) => update('businessName', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Apex Essentials Pvt Ltd" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Full Name *</label>
                <input required value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Ramesh Kumar" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                <input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="9876543210" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="owner@business.com" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <input required type="password" value={form.password} onChange={(e) => update('password', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Min. 8 characters" minLength={8} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                <input required type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Re-enter password" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                <select required value={form.category} onChange={(e) => update('category', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                <select required value={form.state} onChange={(e) => update('state', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN <span className="font-normal text-slate-400">(optional)</span></label>
                <input value={form.gstin} onChange={(e) => update('gstin', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase tracking-wider"
                  placeholder="22AAAAA0000A1Z5" maxLength={15} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-lg text-sm transition-colors disabled:opacity-60 shadow-sm mt-2">
              {loading ? 'Registering…' : 'Register Business →'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already registered?{' '}
              <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
