import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const fullPath = pathname + search;

  // Enhanced debug logging for production troubleshooting
  console.log('🔐 Middleware check:', {
    pathname,
    fullPath,
    hasAuth: !!req.auth,
    userEmail: req.auth?.user?.email || 'none',
    userAgent: req.headers.get('user-agent')?.substring(0, 50) || 'unknown'
  });

  // Prevent redirect loops - if we're already being redirected, don't redirect again
  if (search.includes('redirect=') || search.includes('error=')) {
    console.log('⚠️ Potential redirect loop detected, allowing through:', fullPath);
    return NextResponse.next();
  }

  // Admin routes protection - session check only
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!req.auth) {
      console.log('❌ Admin route, no auth, redirecting to admin login');
      const loginUrl = new URL('/admin/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
    console.log('✅ Admin route, auth found, allowing access');
  }

  // Dashboard routes protection - require authentication
  if (pathname.startsWith('/dashboard')) {
    if (!req.auth) {
      console.log('❌ Dashboard route, no auth, redirecting to login');
      const loginUrl = new URL('/', req.url);
      return NextResponse.redirect(loginUrl);
    }
    console.log('✅ Dashboard route, auth found, allowing access');
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*']
};
