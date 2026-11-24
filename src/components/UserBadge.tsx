'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

interface Profile {
  full_name: string
  role: string
}

export default function UserBadge() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single()

        setProfile(data)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return <div className="w-24 h-8 bg-slate-100 animate-pulse rounded-lg" />
  }

  if (!profile) {
    return (
      <Link
        href="/login"
        className="px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
      >
        Sign In
      </Link>
    )
  }

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const roleColor =
    profile.role === 'superadmin'
      ? 'text-purple-600'
      : profile.role === 'admin'
      ? 'text-emerald-600'
      : 'text-slate-500'

  return (
    <div className="flex items-center space-x-2">
      <div className="text-right hidden sm:block">
        <div className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{profile.full_name}</div>
        <div className={`text-[10px] font-semibold uppercase ${roleColor}`}>
          {profile.role}
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-xs text-amber-800">
        {initials}
      </div>
      <button
        onClick={handleSignOut}
        title="Sign out"
        className="ml-1 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
        </svg>
      </button>
    </div>
  )
}
