const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
let url, anonKey;
env.split('\n').forEach(l => {
  const [k, ...v] = l.trim().split('=');
  if (k === 'NEXT_PUBLIC_SUPABASE_URL') url = v.join('=').trim();
  if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') anonKey = v.join('=').trim();
});

const client = createClient(url, anonKey, { auth: { persistSession: false } });

async function testStaffLogin() {
  const cleanPhone = '9876543210';
  const pin = '1234';
  const syntheticEmail = `staff_${cleanPhone}@blinkit.internal`;
  const syntheticPassword = `PIN_${pin}_Password`;

  console.log(`Authenticating staff with ${syntheticEmail}...`);
  const { data, error } = await client.auth.signInWithPassword({
    email: syntheticEmail,
    password: syntheticPassword,
  });

  if (error) {
    console.error('Staff login error:', error);
  } else {
    console.log('✓ Staff logged in successfully! User ID:', data.user.id, 'Email:', data.user.email);
  }
}
testStaffLogin();
