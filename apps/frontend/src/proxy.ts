import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// The cookie is only a navigation hint. Nest checks the signed session on every API request.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieRole = request.cookies.get('user_role')?.value;
  const role = cookieRole === 'employee' ? 'guard' : cookieRole === 'guard' || cookieRole === 'admin' ? cookieRole : undefined;

  if (pathname.startsWith('/employee')) {
    return NextResponse.redirect(new URL(role === 'admin' ? '/admin/dashboard' : role === 'guard' ? '/guard/dashboard' : '/login', request.url));
  }

  if (pathname.startsWith('/admin')) {
    if (!role) return NextResponse.redirect(new URL('/login', request.url));
    if (role !== 'admin') return NextResponse.redirect(new URL('/guard/dashboard', request.url));
  }

  if (pathname.startsWith('/guard')) {
    if (!role) return NextResponse.redirect(new URL('/login', request.url));
    if (role !== 'guard') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  if (pathname === '/login' || pathname === '/') {
    if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    if (role === 'guard') return NextResponse.redirect(new URL('/guard/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/guard/:path*', '/employee/:path*'],
};
