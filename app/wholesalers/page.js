'use client';
import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';

export default function WholesalersPage() {
    const [wholesalers, setWholesalers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', address: '' });

    const fetchData = async () => {
        try {
            const res = await fetch('/api/wholesalers');
            setWholesalers(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/wholesalers', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            showToast('Wholesaler added');
            setShowModal(false);
            fetchData();
        } catch (e) { showToast('Error adding wholesaler', 'error'); }
    };

    if (loading) return <div className="spinner" />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Wholesalers</h2>
                    <p>Manage your product suppliers</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setForm({ name: '', phone: '', address: '' }); setShowModal(true); }}>+ Add Wholesaler</button>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {wholesalers.length === 0 ? (
                    <div className="empty-state"><div className="icon">🏭</div><h3>No wholesalers yet</h3></div>
                ) : wholesalers.map((w) => (
                    <div className="glass-card" key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🏭</div>
                        <div style={{ minWidth: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{w.name}</h3>
                            <p style={{ margin: '2px 0', fontSize: '0.85rem', color: 'var(--muted)' }}>{w.phone || 'No phone'}</p>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.address || 'No address'}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Wholesaler">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Name *</label>
                        <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Phone</label>
                        <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Address</label>
                        <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Wholesaler</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
