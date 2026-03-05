import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Debug logging
  if (pathname.startsWith('/dashboard')) {
    console.log('🔐 Middleware check:', {
      pathname,
      hasAuth: !!req.auth,
      user: req.auth?.user?.email || 'none'
    });
  }

  // Admin routes protection
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!req.auth) {
      const loginUrl = new URL('/admin/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Dashboard routes protection - require authentication
  if (pathname.startsWith('/dashboard')) {
    if (!req.auth) {
      console.log('❌ No auth, redirecting to login');
      const loginUrl = new URL('/', req.url);
      return NextResponse.redirect(loginUrl);
    }
    console.log('✅ Auth found, allowing access');
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*']
};
