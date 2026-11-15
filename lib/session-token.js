import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'milk_delivery_session';

function getSessionSecret() {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('AUTH_SESSION_SECRET must contain at least 32 characters');
    }
    return secret;
}

export function createSessionToken(sessionId, role) {
    const signature = createHmac('sha256', getSessionSecret())
        .update(`${sessionId}.${role}`)
        .digest('hex');
    return `${sessionId}.${role}.${signature}`;
}

export function parseSessionToken(token) {
    if (typeof token !== 'string') return null;
    const [sessionId, role, signature, extra] = token.split('.');
    if (!sessionId || !['admin', 'agent'].includes(role) || !signature || extra || !/^[a-f0-9]{36}$/.test(sessionId)) {
        return null;
    }

    const expected = Buffer.from(createSessionToken(sessionId, role).split('.').at(-1), 'hex');
    const actual = Buffer.from(signature, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

    return { sessionId, role };
}
