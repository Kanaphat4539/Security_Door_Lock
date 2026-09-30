import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// The cookie is a navigation hint for the proxy. Nest checks the signed session on every API request.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;
  const cookieRole = request.cookies.get('user_role')?.value;
  const role = cookieRole === 'employee' ? 'guard' : cookieRole === 'guard' || cookieRole === 'admin' ? cookieRole : undefined;

  // Root always redirects to /login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Auth pages (login, register) are always accessible
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.next();
  }

  // Legacy employee route redirect
  if (pathname.startsWith('/employee')) {
    if (!token || !role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL(role === 'admin' ? '/admin/dashboard' : '/guard/dashboard', request.url));
  }

  // Protected admin routes
  if (pathname.startsWith('/admin')) {
    if (!token || !role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/guard/dashboard', request.url));
    }
  }

  // Protected guard routes
  if (pathname.startsWith('/guard')) {
    if (!token || !role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (role !== 'guard') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/register', '/admin/:path*', '/guard/:path*', '/employee/:path*'],
};

