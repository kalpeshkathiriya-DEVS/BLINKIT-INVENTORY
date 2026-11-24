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

async function testSuperBusinesses() {
  const { data: orgs } = await client.from('organizations').select('*');
  const { data: profiles } = await client.from('profiles').select('*');
  console.log('Total Organizations:', orgs.length);
  orgs.forEach(o => {
    const owner = profiles.find(p => p.org_id === o.id);
    console.log(`- [${o.status.toUpperCase()}] ${o.name} (${o.category}) | Owner: ${owner?.full_name || 'N/A'} | Users: ${profiles.filter(p => p.org_id === o.id).length}`);
  });
}
testSuperBusinesses();
