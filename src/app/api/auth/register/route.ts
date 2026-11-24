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

const CATEGORY_MAP: Record<string, string> = {
  'Home & Kitchen': 'home_kitchen',
  'home_kitchen': 'home_kitchen',
  'Clothing': 'clothing',
  'clothing': 'clothing',
  'Manufacturing': 'manufacturing',
  'manufacturing': 'manufacturing',
  'Other': 'other',
  'other': 'other',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessName, ownerName, phone, email, password, category, gstin, state } = body;

    if (!businessName || !ownerName || !email || !password || !category || !state) {
      return NextResponse.json({ error: 'Missing required registration fields.' }, { status: 400 });
    }

    const dbCategory = CATEGORY_MAP[category] || 'other';
    const supabase = getServiceClient();

    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: 'Registration recorded (offline mode).',
        org: { name: businessName, category: dbCategory, status: 'pending' },
      });
    }

    // 1. Create organization with status='pending'
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({
        name: businessName,
        category: dbCategory,
        gstin: gstin || null,
        state,
        phone,
        email,
        status: 'pending',
        plan: 'free',
      })
      .select('*')
      .single();

    if (orgErr) {
      console.error('Org creation error:', orgErr);
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }

    // 2. Create Auth User
    let userId: string;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        org_id: org.id,
        role: 'admin',
      },
    });

    if (authErr) {
      // If user already exists in auth, find them
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingUser = listData?.users?.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
      } else {
        await supabase.from('organizations').delete().eq('id', org.id);
        console.error('Auth user creation error:', authErr);
        return NextResponse.json({ error: authErr.message }, { status: 500 });
      }
    } else {
      userId = authData.user.id;
    }

    // 3. Create or update profile record
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: userId,
      org_id: org.id,
      full_name: ownerName,
      phone,
      role: 'admin',
      is_active: false, // Inactive until approved by SuperAdmin
    });

    if (profileErr) {
      console.error('Profile creation error:', profileErr);
    }

    return NextResponse.json({
      success: true,
      orgId: org.id,
      businessName: org.name,
      status: org.status,
    });
  } catch (err: unknown) {
    console.error('Register route error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
