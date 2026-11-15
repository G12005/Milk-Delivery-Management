import 'server-only';

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COLLECTIONS, DATABASE_ID, getDatabases, Query } from '@/lib/appwrite';
import { createSessionToken, parseSessionToken, SESSION_COOKIE } from '@/lib/session-token';

export { SESSION_COOKIE };
export const SESSION_MAX_AGE_SECONDS = 72 * 60 * 60;

function getAdminEmails() {
    return new Set(
        (process.env.FIREBASE_ADMIN_EMAILS || '')
            .split(',')
            .map(email => email.trim().toLowerCase())
            .filter(Boolean)
    );
}

async function findPrincipal(email, firebaseUid, sessionId) {
    if (getAdminEmails().has(email)) {
        return { uid: firebaseUid, email, role: 'admin', agentId: null, sessionId };
    }

    const db = getDatabases();
    const agents = await db.listDocuments(DATABASE_ID, COLLECTIONS.DELIVERY_AGENTS, [
        Query.equal('email', email),
        Query.limit(2),
    ]);

    const agent = agents.documents.find(item => item.email?.toLowerCase() === email);
    if (!agent || agent.is_active === false) return null;

    return { uid: firebaseUid, email, role: 'agent', agentId: agent.$id, sessionId };
}

export async function createAppSession({ uid, email }) {
    const normalizedEmail = email.trim().toLowerCase();
    const sessionId = randomBytes(18).toString('hex');
    const principal = await findPrincipal(normalizedEmail, uid, sessionId);

    if (!principal) return null;

    const now = new Date().toISOString();
    await getDatabases().createDocument(
        DATABASE_ID,
        COLLECTIONS.AUTH_SESSIONS,
        sessionId,
        {
            firebase_uid: uid,
            email: normalizedEmail,
            agent_id: principal.agentId || '',
            last_active_at: now,
        }
    );

    return {
        ...principal,
        token: createSessionToken(sessionId, principal.role),
    };
}

export async function getPrincipalFromSessionToken(token) {
    const claims = parseSessionToken(token);
    if (!claims) return null;
    const { sessionId, role } = claims;

    const db = getDatabases();
    let session;
    try {
        session = await db.getDocument(DATABASE_ID, COLLECTIONS.AUTH_SESSIONS, sessionId);
    } catch (error) {
        if (error?.code === 404) return null;
        throw error;
    }

    const lastActive = Date.parse(session.last_active_at);
    if (!Number.isFinite(lastActive) || Date.now() - lastActive >= SESSION_MAX_AGE_SECONDS * 1000) {
        await deleteSession(sessionId);
        return null;
    }

    const principal = await findPrincipal(
        session.email?.toLowerCase() || '',
        session.firebase_uid,
        sessionId
    );

    if (!principal || principal.role !== role || (principal.role === 'agent' && principal.agentId !== session.agent_id)) {
        await deleteSession(sessionId);
        return null;
    }

    return principal;
}

export async function touchSession(sessionId) {
    await getDatabases().updateDocument(
        DATABASE_ID,
        COLLECTIONS.AUTH_SESSIONS,
        sessionId,
        { last_active_at: new Date().toISOString() }
    );
}

export async function deleteSession(sessionId) {
    try {
        await getDatabases().deleteDocument(DATABASE_ID, COLLECTIONS.AUTH_SESSIONS, sessionId);
    } catch (error) {
        if (error?.code !== 404) throw error;
    }
}

export async function deleteSessionFromToken(token) {
    const claims = parseSessionToken(token);
    if (claims) await deleteSession(claims.sessionId);
}

export async function revokeAgentSessions(agentId) {
    const db = getDatabases();
    while (true) {
        const sessions = await db.listDocuments(DATABASE_ID, COLLECTIONS.AUTH_SESSIONS, [
            Query.equal('agent_id', agentId),
            Query.limit(100),
        ]);
        if (sessions.documents.length === 0) break;
        await Promise.all(sessions.documents.map(session => deleteSession(session.$id)));
    }
}

export async function getCurrentPrincipal() {
    const cookieStore = await cookies();
    return getPrincipalFromSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function authorizeRole(role) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE)?.value;
        const principal = await getPrincipalFromSessionToken(token);
        if (!principal) {
            return {
                principal: null,
                response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
            };
        }
        if (principal.role !== role) {
            return {
                principal: null,
                response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
            };
        }

        await touchSession(principal.sessionId);
        cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
        return { principal, response: null };
    } catch (error) {
        console.error('API authorization failed:', error);
        return {
            principal: null,
            response: NextResponse.json({ error: 'Unable to verify access' }, { status: 503 }),
        };
    }
}

export function sessionCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
    };
}
