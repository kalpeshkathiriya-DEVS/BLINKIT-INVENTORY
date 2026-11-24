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

// GET: list staff for org
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    let query = supabase
      .from('profiles')
      .select('id, org_id, full_name, phone, role, is_active, created_at')
      .eq('role', 'user')
      .order('created_at', { ascending: false });

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data: staff, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      staff: (staff || []).map(s => ({
        id: s.id,
        name: s.full_name,
        phone: s.phone,
        role: s.role,
        isActive: s.is_active,
        createdAt: s.created_at,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: create, toggle_active, reset_pin
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, orgId, name, phone, pin, staffId, isActive } = body;

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    if (action === 'create') {
      if (!name || !phone || !pin || !orgId) {
        return NextResponse.json({ error: 'Name, phone, PIN, and orgId are required.' }, { status: 400 });
      }

      const cleanPhone = phone.replace(/\D/g, '');
      const syntheticEmail = `staff_${cleanPhone}@blinkit.internal`;
      const syntheticPassword = `PIN_${pin}_Password`;

      // 1. Create auth user
      let userId: string;
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: syntheticEmail,
        password: syntheticPassword,
        email_confirm: true,
        user_metadata: { full_name: name, role: 'user', org_id: orgId },
      });

      if (authErr) {
        // If already exists, update password
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users?.find(u => u.email === syntheticEmail);
        if (existing) {
          userId = existing.id;
          await supabase.auth.admin.updateUserById(userId, { password: syntheticPassword });
        } else {
          return NextResponse.json({ error: authErr.message }, { status: 500 });
        }
      } else {
        userId = authData.user.id;
      }

      // 2. Upsert profile
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: userId,
        org_id: orgId,
        full_name: name,
        phone: cleanPhone,
        role: 'user',
        is_active: true,
      });

      if (profErr) {
        return NextResponse.json({ error: profErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        staff: {
          id: userId,
          name,
          phone: cleanPhone,
          role: 'user',
          isActive: true,
        },
      });
    }

    if (action === 'toggle_active') {
      if (!staffId) {
        return NextResponse.json({ error: 'staffId is required.' }, { status: 400 });
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: Boolean(isActive) })
        .eq('id', staffId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, isActive: Boolean(isActive) });
    }

    if (action === 'reset_pin') {
      if (!staffId || !pin) {
        return NextResponse.json({ error: 'staffId and PIN are required.' }, { status: 400 });
      }

      const syntheticPassword = `PIN_${pin}_Password`;
      const { error: authErr } = await supabase.auth.admin.updateUserById(staffId, {
        password: syntheticPassword,
      });

      if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'PIN updated successfully.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
