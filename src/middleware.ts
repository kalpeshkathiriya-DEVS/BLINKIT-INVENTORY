import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/pending']
const SUPER_ROUTES = ['/super']
const ADMIN_ONLY_ROUTES = ['/admin', '/staff', '/products', '/ro-import', '/stock', '/reports']
const STAFF_ALLOWED_ROUTES = ['/scan', '/inwards', '/grn-claims', '/pos']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow static files, api, and next internal assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // 1. Always allow public auth routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // 2. Check user_role cookie
  const userRole = request.cookies.get('user_role')?.value

  // IF NO ROLE COOKIE -> Unauthenticated! Strictly redirect to /login
  if (!userRole) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // 3. Handle root path ('/')
  if (pathname === '/') {
    if (userRole === 'superadmin') {
      return NextResponse.redirect(new URL('/super', request.url))
    }
    if (userRole === 'user') {
      return NextResponse.redirect(new URL('/scan', request.url))
    }
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // 4. Role Protection: SuperAdmin Route (/super)
  if (SUPER_ROUTES.some((r) => pathname.startsWith(r))) {
    if (userRole !== 'superadmin') {
      const redirectTarget = userRole === 'user' ? '/scan' : '/admin'
      return NextResponse.redirect(new URL(`${redirectTarget}?error=unauthorized`, request.url))
    }
  }

  // 5. Role Protection: Admin-Only Routes (/admin, /staff, /products, /ro-import, /stock, /reports)
  if (ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    if (userRole === 'user') {
      // Staff cannot access admin modules
      return NextResponse.redirect(new URL('/scan?error=unauthorized', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
