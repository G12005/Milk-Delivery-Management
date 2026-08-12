'use client';
import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';

export default function BankAccountsPage() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ bank_name: '', account_number: '', ifsc: '' });

    const fetchData = async () => {
        try {
            const res = await fetch('/api/bank-accounts');
            setAccounts(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/bank-accounts', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            showToast('Bank account added');
            setShowModal(false);
            fetchData();
        } catch (e) { showToast('Error adding bank account', 'error'); }
    };

    if (loading) return <div className="spinner" />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Bank Accounts</h2>
                    <p>Manage bank accounts for receiving payments</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setForm({ bank_name: '', account_number: '', ifsc: '' }); setShowModal(true); }}>+ Add Account</button>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {accounts.length === 0 ? (
                    <div className="empty-state"><div className="icon">🏦</div><h3>No bank accounts yet</h3></div>
                ) : accounts.map((a) => (
                    <div className="glass-card" key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🏦</div>
                        <div style={{ minWidth: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{a.bank_name}</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>A/C: {a.account_number || '—'}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>IFSC: {a.ifsc || '—'}</p>
                        </div>
                        <span className={`badge ${a.is_active ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 'auto' }}>
                            {a.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                ))}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Bank Account">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Bank Name *</label>
                        <input className="form-control" required value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Account Number</label>
                            <input className="form-control" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>IFSC Code</label>
                            <input className="form-control" value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Account</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
