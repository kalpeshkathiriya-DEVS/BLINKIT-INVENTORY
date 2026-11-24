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

export async function GET() {
  try {
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });
    }

    // 1. Fetch all organizations
    const { data: orgs, error: orgErr } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (orgErr) {
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }

    // 2. Fetch profiles for user counts and owner info
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, org_id, full_name, role, is_active, phone');

    const formatted = (orgs || []).map(org => {
      const orgProfiles = (profiles || []).filter(p => p.org_id === org.id);
      const owner = orgProfiles.find(p => p.role === 'admin') || orgProfiles[0];

      // Format category for display
      let displayCategory = org.category;
      if (org.category === 'home_kitchen') displayCategory = 'Home & Kitchen';
      else if (org.category === 'clothing') displayCategory = 'Clothing';
      else if (org.category === 'manufacturing') displayCategory = 'Manufacturing';
      else if (org.category === 'other') displayCategory = 'Other';

      return {
        id: org.id,
        name: org.name,
        category: displayCategory,
        rawCategory: org.category,
        phone: org.phone || owner?.phone || '',
        email: org.email || '',
        state: org.state || '',
        status: org.status,
        plan: org.plan || 'free',
        ownerName: owner?.full_name || 'Business Owner',
        usersCount: orgProfiles.length || 1,
        createdAt: org.created_at,
        lastActive: 'Active recently',
      };
    });

    return NextResponse.json({ businesses: formatted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, orgId, businessData } = body;

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });
    }

    if (action === 'approve') {
      // 1. Set org status = active
      const { error: orgErr } = await supabase
        .from('organizations')
        .update({ status: 'active' })
        .eq('id', orgId);

      if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

      // 2. Activate owner and all users in this org
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('org_id', orgId);

      if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

      // 3. Log audit event
      await supabase.from('audit_log').insert({
        org_id: orgId,
        table_name: 'organizations',
        record_id: orgId,
        action: 'business_approved',
        new_data: { status: 'active', approved_by: 'Super Administrator' },
      });

      return NextResponse.json({ success: true, status: 'active' });
    }

    if (action === 'block') {
      const { error: orgErr } = await supabase
        .from('organizations')
        .update({ status: 'blocked' })
        .eq('id', orgId);

      if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

      // Deactivate profiles to block immediate login
      await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('org_id', orgId);

      await supabase.from('audit_log').insert({
        org_id: orgId,
        table_name: 'organizations',
        record_id: orgId,
        action: 'business_blocked',
        new_data: { status: 'blocked', blocked_by: 'Super Administrator' },
      });

      return NextResponse.json({ success: true, status: 'blocked' });
    }

    if (action === 'unblock') {
      const { error: orgErr } = await supabase
        .from('organizations')
        .update({ status: 'active' })
        .eq('id', orgId);

      if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

      await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('org_id', orgId);

      await supabase.from('audit_log').insert({
        org_id: orgId,
        table_name: 'organizations',
        record_id: orgId,
        action: 'business_unblocked',
        new_data: { status: 'active', unblocked_by: 'Super Administrator' },
      });

      return NextResponse.json({ success: true, status: 'active' });
    }

    if (action === 'create' && businessData) {
      // Manual creation by SuperAdmin
      const categoryMap: Record<string, string> = {
        'Home & Kitchen': 'home_kitchen',
        'Clothing': 'clothing',
        'Manufacturing': 'manufacturing',
        'Other': 'other',
      };
      const dbCat = categoryMap[businessData.category] || businessData.category || 'other';

      const { data: newOrg, error: newOrgErr } = await supabase
        .from('organizations')
        .insert({
          name: businessData.name,
          category: dbCat,
          phone: businessData.phone,
          email: businessData.email,
          state: businessData.state,
          status: 'active', // Pre-approved when created by SuperAdmin
          plan: businessData.plan || 'pro',
        })
        .select('*')
        .single();

      if (newOrgErr) return NextResponse.json({ error: newOrgErr.message }, { status: 500 });

      // Create owner user
      const { data: newUser, error: userErr } = await supabase.auth.admin.createUser({
        email: businessData.email,
        password: businessData.password || 'AdminUser@123',
        email_confirm: true,
        user_metadata: { full_name: businessData.ownerName, role: 'admin', org_id: newOrg.id },
      });

      if (!userErr && newUser?.user) {
        await supabase.from('profiles').upsert({
          id: newUser.user.id,
          org_id: newOrg.id,
          full_name: businessData.ownerName,
          phone: businessData.phone,
          role: 'admin',
          is_active: true,
        });
      }

      return NextResponse.json({ success: true, org: newOrg });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
