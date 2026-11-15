'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inMemoryPersistence, setPersistence, signInWithPopup, signOut } from 'firebase/auth';
import { createGoogleProvider, getFirebaseAuth } from '@/lib/firebase-client';

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        let auth;
        try {
            auth = getFirebaseAuth();
            await setPersistence(auth, inMemoryPersistence);
            const credential = await signInWithPopup(auth, createGoogleProvider());
            const idToken = await credential.user.getIdToken();
            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Unable to sign in');
            await signOut(auth).catch(console.error);
            router.replace(result.redirectTo);
            router.refresh();
        } catch (signInError) {
            if (auth?.currentUser) await signOut(auth).catch(console.error);
            if (signInError.code === 'auth/popup-closed-by-user') {
                setError('Sign-in was cancelled.');
            } else {
                setError(signInError.message || 'Unable to sign in.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <section className="auth-card">
                <h1 className="font-bold text-2xl">Milk Delivery Management</h1>
                <p>Sign in with the Google account registered by your administrator.</p>
                <button className="btn btn-primary auth-button flex items-center justify-center" onClick={handleGoogleSignIn} disabled={loading}>
                    {loading ? 'Signing in…' : 'Continue with Google'}
                    <svg xmlns="http://w3.org" viewBox="0 0 48 48" width="24px" height="24px">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                </button>
                {error && <p className="auth-error" role="alert">{error}</p>}
            </section>
        </div>
    );
}
