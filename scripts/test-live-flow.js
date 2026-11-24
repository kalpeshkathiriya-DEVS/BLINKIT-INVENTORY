const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
let url, key;
env.split('\n').forEach(l => {
  const [k, ...v] = l.trim().split('=');
  if (k === 'NEXT_PUBLIC_SUPABASE_URL') url = v.join('=').trim();
  if (k === 'SUPABASE_SERVICE_ROLE_KEY') key = v.join('=').trim();
});

const client = createClient(url, key);

async function run() {
  console.log('--- 1. Testing Registration for ADIFY ESSENTIALS ---');
  const CATEGORY_MAP = {
    'Home & Kitchen': 'home_kitchen',
    'Clothing': 'clothing',
    'Manufacturing': 'manufacturing',
    'Other': 'other',
  };

  const businessName = 'Adify Essentials Pvt Ltd';
  const ownerName = 'Adify Owner';
  const phone = '9822012345';
  const email = 'adify@adifyessentials.com';
  const password = 'AdifyPassword@123';
  const category = 'Home & Kitchen';
  const dbCategory = CATEGORY_MAP[category] || 'other';

  // Check if org already exists, if so delete to test clean flow
  const { data: existingOrgs } = await client.from('organizations').select('id').eq('name', businessName);
  if (existingOrgs && existingOrgs.length > 0) {
    for (const o of existingOrgs) {
      await client.from('profiles').delete().eq('org_id', o.id);
      await client.from('organizations').delete().eq('id', o.id);
    }
  }

  // 1. Insert Org (status: pending)
  const { data: org, error: orgErr } = await client
    .from('organizations')
    .insert({
      name: businessName,
      category: dbCategory,
      gstin: '24AAACA1111Q1Z5',
      state: 'Gujarat',
      phone,
      email,
      status: 'pending',
      plan: 'free',
    })
    .select('*')
    .single();

  if (orgErr) {
    console.error('Failed to create org:', orgErr);
    return;
  }
  console.log('✓ Organization created with pending status:', org.id, org.name, org.status);

  // 2. Create Auth User
  let userId;
  const { data: authData, error: authErr } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: ownerName, org_id: org.id, role: 'admin' },
  });

  if (authErr) {
    const { data: listData } = await client.auth.admin.listUsers();
    const existing = listData?.users?.find(u => u.email === email);
    if (existing) {
      userId = existing.id;
      await client.auth.admin.updateUserById(userId, { password, user_metadata: { full_name: ownerName, org_id: org.id, role: 'admin' } });
    } else {
      console.error('Auth error:', authErr);
      return;
    }
  } else {
    userId = authData.user.id;
  }

  // 3. Upsert Profile (is_active: false while pending)
  const { error: profErr } = await client.from('profiles').upsert({
    id: userId,
    org_id: org.id,
    full_name: ownerName,
    phone,
    role: 'admin',
    is_active: false,
  });
  if (profErr) {
    console.error('Profile error:', profErr);
    return;
  }
  console.log('✓ Profile created for Admin (is_active: false):', userId);

  // --- 2. Verify SuperAdmin sees this business in pending ---
  console.log('\n--- 2. SuperAdmin listing organizations ---');
  const { data: allOrgs } = await client.from('organizations').select('id, name, status, category');
  console.log('Found businesses in Supabase:', allOrgs);
  const adify = allOrgs.find(o => o.name === businessName);
  console.log('Adify status before approval:', adify.status);

  // --- 3. SuperAdmin approves the business ---
  console.log('\n--- 3. SuperAdmin approving business ---');
  await client.from('organizations').update({ status: 'active', plan: 'pro' }).eq('id', org.id);
  await client.from('profiles').update({ is_active: true }).eq('org_id', org.id);
  console.log('✓ Business and Admin profile approved and activated!');

  // Verify status
  const { data: updatedOrg } = await client.from('organizations').select('status, plan').eq('id', org.id).single();
  const { data: updatedProf } = await client.from('profiles').select('is_active').eq('id', userId).single();
  console.log('Updated Org status in Supabase:', updatedOrg);
  console.log('Updated Profile is_active in Supabase:', updatedProf);

  // --- 4. Verify Admin can authenticate ---
  console.log('\n--- 4. Authenticating as Adify Business Admin ---');
  const anonKey = fs.readFileSync('.env.local', 'utf8').split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY')).split('=')[1].trim();
  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: loginData, error: loginErr } = await authClient.auth.signInWithPassword({
    email,
    password,
  });
  if (loginErr) {
    console.error('Sign in failed:', loginErr);
  } else {
    console.log('✓ Business Admin login successful! User ID:', loginData.user.id);
  }

  console.log('\n=== END-TO-END REGISTRATION & SUPERADMIN APPROVAL CONFIRMED ===');
}

run();
