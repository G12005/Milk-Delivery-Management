import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';
import {
    createAppSession,
    deleteSessionFromToken,
    getCurrentPrincipal,
    SESSION_COOKIE,
    sessionCookieOptions,
} from '@/lib/auth-session';
import { cookies } from 'next/headers';

export async function POST(request) {
    try {
        const { idToken } = await request.json();
        if (typeof idToken !== 'string' || !idToken) {
            return NextResponse.json({ error: 'Google sign-in token required' }, { status: 400 });
        }

        const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken, true);
        if (!decoded.email || decoded.email_verified !== true) {
            return NextResponse.json({ error: 'Use a verified Google account' }, { status: 403 });
        }

        const session = await createAppSession({
            uid: decoded.uid,
            email: decoded.email,
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Account is not registered or has been deactivated. Contact the administrator.' },
                { status: 403 }
            );
        }

        const response = NextResponse.json({
            role: session.role,
            redirectTo: session.role === 'admin' ? '/' : '/agent-deliveries',
        });
        response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions());
        return response;
    } catch (error) {
        console.error('Authentication session creation failed:', error);
        return NextResponse.json({ error: 'Unable to sign in. Check server authentication setup.' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const principal = await getCurrentPrincipal();
        if (!principal) {
            return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
        }
        return NextResponse.json({
            role: principal.role,
            email: principal.email,
            redirectTo: principal.role === 'admin' ? '/' : '/agent-deliveries',
        });
    } catch (error) {
        console.error('Authentication session lookup failed:', error);
        return NextResponse.json({ error: 'Unable to verify session' }, { status: 503 });
    }
}

export async function DELETE() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    try {
        await deleteSessionFromToken(token);
    } catch (error) {
        console.error('Authentication session deletion failed:', error);
        return NextResponse.json({ error: 'Unable to sign out cleanly' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
    return response;
}
