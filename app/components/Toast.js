'use client';
import { useState, useEffect, useCallback } from 'react';

let toastId = 0;

export function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success') => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, []);

    useEffect(() => {
        window.__addToast = addToast;
        return () => { delete window.__addToast; };
    }, [addToast]);

    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    {t.message}
                </div>
            ))}
        </div>
    );
}

export function showToast(message, type = 'success') {
    if (typeof window !== 'undefined' && window.__addToast) {
        window.__addToast(message, type);
    }
}
