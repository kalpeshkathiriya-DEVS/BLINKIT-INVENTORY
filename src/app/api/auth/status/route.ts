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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const businessName = searchParams.get('businessName');

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ status: 'pending' });
    }

    let query = supabase.from('organizations').select('id, name, status, plan');

    if (orgId) {
      query = query.eq('id', orgId);
    } else if (businessName) {
      query = query.ilike('name', businessName);
    } else {
      return NextResponse.json({ error: 'Missing orgId or businessName query param' }, { status: 400 });
    }

    const { data: org, error } = await query.single();

    if (error || !org) {
      return NextResponse.json({ status: 'not_found' });
    }

    return NextResponse.json({
      status: org.status,
      orgId: org.id,
      name: org.name,
      plan: org.plan,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
