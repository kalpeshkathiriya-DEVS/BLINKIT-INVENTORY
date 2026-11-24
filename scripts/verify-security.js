const http = require('http');

function testRoute(path, cookie) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path,
        method: 'GET',
        headers: cookie ? { Cookie: cookie } : {},
      },
      (res) => {
        resolve({
          statusCode: res.statusCode,
          location: res.headers.location,
        });
      }
    );
    req.on('error', (e) => resolve({ error: e.message }));
    req.end();
  });
}

async function verifySecurity() {
  console.log('--- 1. Testing Unauthenticated Access ---');
  // 1. Visit /super without cookie -> should redirect to /login
  const superUnauth = await testRoute('/super');
  console.log('/super unauth:', superUnauth.statusCode, '->', superUnauth.location);

  // 2. Visit /admin without cookie -> should redirect to /login
  const adminUnauth = await testRoute('/admin');
  console.log('/admin unauth:', adminUnauth.statusCode, '->', adminUnauth.location);

  // 3. Visit /stock without cookie -> should redirect to /login
  const stockUnauth = await testRoute('/stock');
  console.log('/stock unauth:', stockUnauth.statusCode, '->', stockUnauth.location);

  // 4. Visit /login without cookie -> should be 200 OK (public)
  const loginPublic = await testRoute('/login');
  console.log('/login public:', loginPublic.statusCode);

  console.log('\n--- 2. Testing Staff Role Access ---');
  // 5. Staff visiting /super -> must redirect to /scan
  const staffSuper = await testRoute('/super', 'user_role=user');
  console.log('/super as staff:', staffSuper.statusCode, '->', staffSuper.location);

  // 6. Staff visiting /admin -> must redirect to /scan
  const staffAdmin = await testRoute('/admin', 'user_role=user');
  console.log('/admin as staff:', staffAdmin.statusCode, '->', staffAdmin.location);

  // 7. Staff visiting /staff -> must redirect to /scan
  const staffStaff = await testRoute('/staff', 'user_role=user');
  console.log('/staff as staff:', staffStaff.statusCode, '->', staffStaff.location);

  // 8. Staff visiting /scan -> should be allowed (200)
  const staffScan = await testRoute('/scan', 'user_role=user');
  console.log('/scan as staff:', staffScan.statusCode);

  console.log('\n--- 3. Testing Business Admin Role Access ---');
  // 9. Admin visiting /super -> must redirect to /admin
  const adminSuper = await testRoute('/super', 'user_role=admin');
  console.log('/super as admin:', adminSuper.statusCode, '->', adminSuper.location);

  // 10. Admin visiting /admin -> should be allowed (200)
  const adminAdmin = await testRoute('/admin', 'user_role=admin');
  console.log('/admin as admin:', adminAdmin.statusCode);

  console.log('\n--- 4. Testing SuperAdmin Role Access ---');
  // 11. SuperAdmin visiting /super -> should be allowed (200)
  const superSuper = await testRoute('/super', 'user_role=superadmin');
  console.log('/super as superadmin:', superSuper.statusCode);
}

verifySecurity();
