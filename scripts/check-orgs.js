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
  const { data: orgs, error } = await client.from('organizations').select('id, name, status, category, created_at');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Organizations:', JSON.stringify(orgs, null, 2));
  }
}
run();
