import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // We'll use a mock cookie 'user_role' to determine access
  const roleCookie = request.cookies.get('user_role');
  const role = roleCookie?.value;

  // Protect Admin routes
  if (pathname.startsWith('/admin')) {
    if (!role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (role !== 'admin') {
      // If employee tries to access admin, redirect to employee profile
      return NextResponse.redirect(new URL('/employee/profile', request.url));
    }
  }

  // Protect Employee routes
  if (pathname.startsWith('/employee')) {
    if (!role) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (role !== 'employee' && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // If logged in user tries to access login page, redirect them based on role
  if (pathname === '/login' || pathname === '/') {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (role === 'employee') {
      return NextResponse.redirect(new URL('/employee/profile', request.url));
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/employee/:path*'],
};
