const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) envVars[k] = v.join('=');
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('Testing Supabase at URL:', envVars.NEXT_PUBLIC_SUPABASE_URL);
  
  // 1. Check organizations
  const { data: orgs, error: orgErr } = await supabase.from('organizations').select('*');
  console.log('Organizations:', orgs?.length, 'error:', orgErr?.message || null);
  if (orgs && orgs.length > 0) console.log(orgs);

  // 2. Check profiles
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  console.log('Profiles:', profiles?.length, 'error:', profErr?.message || null);

  // 3. Check auth users
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
  console.log('Auth Users:', users?.users?.length, 'error:', userErr?.message || null);
  if (users?.users) {
    users.users.forEach(u => console.log('User:', u.email, 'id:', u.id));
  }
}

check();
