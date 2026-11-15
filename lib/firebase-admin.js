import 'server-only';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function getFirebaseAdminAuth() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const missing = [
        ['FIREBASE_PROJECT_ID', projectId],
        ['FIREBASE_CLIENT_EMAIL', clientEmail],
        ['FIREBASE_PRIVATE_KEY', privateKey],
    ].filter(([, value]) => !value).map(([name]) => name);

    if (missing.length > 0) {
        throw new Error(`Missing server Firebase configuration: ${missing.join(', ')}`);
    }

    const app = getApps().length
        ? getApps()[0]
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
        });

    return getAuth(app);
}
