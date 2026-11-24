import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('your-project-id')) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: 'Phone number and PIN are required.' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const supabase = getServiceClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase configuration missing.' }, { status: 500 });
    }

    // 1. Look up profile by phone where role = 'user'
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, org_id, full_name, phone, role, is_active, organizations(status, name)')
      .eq('phone', cleanPhone)
      .eq('role', 'user')
      .maybeSingle();

    if (profErr || !profile) {
      return NextResponse.json(
        { error: 'Staff account not found. Ask your Business Admin to register you in Staff Management.' },
        { status: 404 }
      );
    }

    if (!profile.is_active) {
      return NextResponse.json(
        { error: 'Staff account is deactivated. Contact your Business Admin.' },
        { status: 403 }
      );
    }

    const org = profile.organizations as any;
    if (org?.status === 'pending') {
      return NextResponse.json(
        { error: 'Your business is pending platform approval. Check back shortly.' },
        { status: 403 }
      );
    }
    if (org?.status === 'blocked') {
      return NextResponse.json(
        { error: 'Your business account is suspended. Contact platform administrator.' },
        { status: 403 }
      );
    }

    // 2. Authenticate synthetic user via Supabase
    const syntheticEmail = `staff_${cleanPhone}@blinkit.internal`;
    const syntheticPassword = `PIN_${pin}_Password`;

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
      email: syntheticEmail,
      password: syntheticPassword,
    });

    if (authErr) {
      return NextResponse.json({ error: 'Invalid PIN code. Please try again.' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        name: profile.full_name,
        role: 'user',
        orgId: profile.org_id,
        orgName: org?.name,
      },
      session: authData.session,
    });

    // Set server cookies for role middleware
    response.cookies.set('user_role', 'user', { path: '/', maxAge: 60 * 60 * 24 });
    response.cookies.set('user_name', profile.full_name, { path: '/', maxAge: 60 * 60 * 24 });
    if (profile.org_id) {
      response.cookies.set('org_id', profile.org_id, { path: '/', maxAge: 60 * 60 * 24 });
    }

    return response;
  } catch (err: unknown) {
    console.error('Staff login error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
