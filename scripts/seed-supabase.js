const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) envVars[k] = v.join('=');
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function seed() {
  console.log('Seeding Supabase database...');

  // 1. Seed Default Organization (Apex Home Essentials)
  const { data: existingOrg, error: orgCheckErr } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', DEFAULT_ORG_ID)
    .single();

  if (!existingOrg) {
    const { error: orgErr } = await supabase.from('organizations').insert({
      id: DEFAULT_ORG_ID,
      name: 'Apex Home Essentials Pvt Ltd',
      category: 'home_kitchen',
      phone: '+91 98790 33445',
      email: 'admin@apexessentials.in',
      gstin: '24AAACA9876Q1Z5',
      state: 'Gujarat',
      status: 'active',
      plan: 'pro',
    });
    if (orgErr) console.error('Error inserting default org:', orgErr);
    else console.log('✓ Default Organization created:', DEFAULT_ORG_ID);
  } else {
    console.log('✓ Default Organization already exists');
  }

  // 2. Create/Ensure SuperAdmin User
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const superAdminEmail = 'superadmin@blinkitops.com';
  let superUser = usersData?.users?.find(u => u.email === superAdminEmail);

  if (!superUser) {
    const { data: newSuper, error: superErr } = await supabase.auth.admin.createUser({
      email: superAdminEmail,
      password: 'SuperAdmin@123',
      email_confirm: true,
      user_metadata: { full_name: 'Platform SuperAdmin', role: 'superadmin' }
    });
    if (superErr) console.error('Error creating superadmin:', superErr);
    else {
      superUser = newSuper.user;
      console.log('✓ SuperAdmin user created:', superUser.id);
    }
  }

  if (superUser) {
    await supabase.from('profiles').upsert({
      id: superUser.id,
      org_id: null,
      full_name: 'Platform SuperAdmin',
      role: 'superadmin',
      is_active: true,
    });
    console.log('✓ SuperAdmin profile active');
  }

  // 3. Create/Ensure Business Admin User (Apex)
  const adminEmail = 'admin@apexessentials.in';
  let adminUser = usersData?.users?.find(u => u.email === adminEmail);

  if (!adminUser) {
    const { data: newAdmin, error: adminErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: 'AdminUser@123',
      email_confirm: true,
      user_metadata: { full_name: 'Apex Business Admin', role: 'admin', org_id: DEFAULT_ORG_ID }
    });
    if (adminErr) console.error('Error creating business admin:', adminErr);
    else {
      adminUser = newAdmin.user;
      console.log('✓ Business Admin user created:', adminUser.id);
    }
  }

  if (adminUser) {
    await supabase.from('profiles').upsert({
      id: adminUser.id,
      org_id: DEFAULT_ORG_ID,
      full_name: 'Apex Business Admin',
      phone: '+91 98790 33445',
      role: 'admin',
      is_active: true,
    });
    console.log('✓ Business Admin profile active');
  }

  // 4. Create/Ensure Staff User (Ravi Kumar: Phone 9876543210, PIN 1234)
  const staffEmail = 'staff_9876543210@blinkit.internal';
  let staffUser = usersData?.users?.find(u => u.email === staffEmail);

  if (!staffUser) {
    const { data: newStaff, error: staffErr } = await supabase.auth.admin.createUser({
      email: staffEmail,
      password: 'PIN_1234_Password',
      email_confirm: true,
      user_metadata: { full_name: 'Ravi Kumar', role: 'user', org_id: DEFAULT_ORG_ID }
    });
    if (staffErr) console.error('Error creating staff user:', staffErr);
    else {
      staffUser = newStaff.user;
      console.log('✓ Staff user created:', staffUser.id);
    }
  }

  if (staffUser) {
    await supabase.from('profiles').upsert({
      id: staffUser.id,
      org_id: DEFAULT_ORG_ID,
      full_name: 'Ravi Kumar',
      phone: '9876543210',
      role: 'user',
      is_active: true,
    });
    console.log('✓ Staff profile active');
  }

  // 5. Seed 18 sample products from 05a spec if table is empty
  const { data: prods } = await supabase.from('products').select('id').eq('org_id', DEFAULT_ORG_ID);
  if (!prods || prods.length === 0) {
    const sampleProducts = [
      { internal_name: "3-in-1 Floor Wiper Brush", official_name: "3-in-1 Floor Cleaning Brush with Wiper", sku: "WIPER-3IN1", upc: "21713050", hsn: "96039000", mrp: 499, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Sink Brush Small", official_name: "Kitchen Sink Cleaning Brush", sku: "SINK-BRUSH-SM", upc: "21713051", hsn: "96039000", mrp: 199, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Kitchen Containers 6pc", official_name: "Airtight Plastic Kitchen Containers Set of 6", sku: "CONT-SET-6", upc: "21713052", hsn: "39241010", mrp: 899, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Silicone Scrub Gloves", official_name: "Silicone Dish Washing Scrub Gloves", sku: "GLOVES-SCRUB", upc: "21713053", hsn: "39249090", mrp: 299, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Spin Mop Bucket Set", official_name: "Microfiber Spin Mop with Bucket Set", sku: "MOP-SPIN-BUCKET", upc: "21713054", hsn: "96039000", mrp: 1799, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Kitchen Paper Towel", official_name: "Kitchen Paper Towel Roll 2-Ply", sku: "TOWEL-ROLL-2P", upc: "21713055", hsn: "48182000", mrp: 150, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Drain Hair Catcher 4pc", official_name: "Multipurpose Drain Hair Catcher", sku: "DRAIN-CATCH-4", upc: "21713056", hsn: "39249090", mrp: 149, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Oil Bottle 500ml", official_name: "Oil Dispenser Bottle with Measurement", sku: "OIL-DISP-500", upc: "21713057", hsn: "39241090", mrp: 399, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Veg Chopper Manual", official_name: "Vegetable and Fruit Chopper Hand Pull", sku: "CHOPPER-PULL", upc: "21713058", hsn: "39241090", mrp: 549, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Door Trash Can 9L", official_name: "Over The Cabinet Door Trash Can", sku: "TRASH-CAB-9L", upc: "21713059", hsn: "39249090", mrp: 699, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Steel Sponge 6pc", official_name: "Stainless Steel Sponge Scrubber Pack", sku: "STEEL-SCRUB-6", upc: "21713060", hsn: "73239390", mrp: 160, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Spice Rack 16 Jar", official_name: "Rotating Spice Rack Organizer", sku: "SPICE-ROT-16", upc: "21713061", hsn: "39249090", mrp: 1499, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Floor Wiper Heavy", official_name: "Heavy Duty Floor Squeegee Wiper", sku: "WIPER-HEAVY", upc: "21713062", hsn: "96039000", mrp: 349, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Ice Cube Tray Lid", official_name: "Silicone Ice Cube Tray with Lid", sku: "ICE-TRAY-LID", upc: "21713063", hsn: "39241010", mrp: 299, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Egg Box 24", official_name: "Egg Storage Box for Refrigerator", sku: "EGG-BOX-24", upc: "21713064", hsn: "39241090", mrp: 499, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Corner Caddy 2pc", official_name: "Adhesive Corner Shower Caddy", sku: "CADDY-CORN-2", upc: "21713065", hsn: "39249090", mrp: 799, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Window Glass Spray", official_name: "Window Glass Cleaner Spray Brush", sku: "WINDOW-SPRAY-BR", upc: "21713066", hsn: "96039000", mrp: 399, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
      { internal_name: "Silicone Spatula 6pc", official_name: "Non-Stick Heat Resistant Silicone Spatula Set", sku: "SPATULA-SET-6", upc: "21713067", hsn: "39249090", mrp: 1299, category: "Home & Kitchen", org_id: DEFAULT_ORG_ID },
    ];

    const { error: prodErr } = await supabase.from('products').insert(sampleProducts);
    if (prodErr) console.error('Error seeding products:', prodErr);
    else console.log('✓ 18 Products seeded successfully in Supabase!');
  } else {
    console.log('✓ Products already exist:', prods.length);
  }

  console.log('--- SEEDING COMPLETE ---');
}

seed();
