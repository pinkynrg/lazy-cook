import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth-edge';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  // Check if user is authenticated
  const session = token ? await verifyToken(token) : null;

  // If accessing auth pages and already authenticated, redirect to home
  if (request.nextUrl.pathname.startsWith('/auth') && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If accessing protected routes and not authenticated, redirect to login
  if (!request.nextUrl.pathname.startsWith('/auth') && 
      !request.nextUrl.pathname.startsWith('/api/auth') &&
      !session) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
