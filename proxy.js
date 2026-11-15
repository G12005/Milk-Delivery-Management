import { NextResponse } from 'next/server';
import { parseSessionToken, SESSION_COOKIE } from '@/lib/session-token';

const publicPaths = ['/login', '/api/auth/session'];

export async function proxy(request) {
    const { pathname } = request.nextUrl;
    if (publicPaths.includes(pathname)) {
        if (pathname === '/login' && request.cookies.has(SESSION_COOKIE)) {
            const claims = parseSessionToken(request.cookies.get(SESSION_COOKIE).value);
            if (claims) {
                return NextResponse.redirect(new URL(
                    claims.role === 'admin' ? '/' : '/agent-deliveries',
                    request.url
                ));
            }
        }
        return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return rejectUnauthenticated(request);

    try {
        const claims = parseSessionToken(token);
        if (!claims) return rejectUnauthenticated(request);

        if (claims.role === 'agent') {
            const allowedAgentPage = pathname === '/agent-deliveries';
            const allowedAgentApi = pathname === '/api/agent-deliveries';
            if (pathname === '/') {
                return NextResponse.redirect(new URL('/agent-deliveries', request.url));
            }
            if (!allowedAgentPage && !allowedAgentApi) {
                if (pathname.startsWith('/api/')) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
                return NextResponse.redirect(new URL('/agent-deliveries', request.url));
            }
        } else if (claims.role === 'admin' && pathname === '/agent-deliveries') {
            return NextResponse.redirect(new URL('/', request.url));
        }

        return NextResponse.next();
    } catch (error) {
        console.error('Request authorization failed:', error);
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unable to verify access' }, { status: 503 });
        }
        return new NextResponse('Unable to verify access. Check server authentication setup.', { status: 503 });
    }
}

function rejectUnauthenticated(request) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
