'use client';
import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import { IconMap } from '../components/Icons';

export default function RoutesPage() {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', area: '' });

    const fetchData = async () => {
        try {
            const res = await fetch('/api/routes');
            const data = await res.json();
            setRoutes(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/routes', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            showToast('Route added successfully');
            setShowModal(false);
            setForm({ name: '', area: '' });
            fetchData();
        } catch (e) { showToast('Error adding route', 'error'); }
    };

    if (loading) return <div className="spinner" />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Delivery Routes</h2>
                    <p>Manage delivery route areas</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setForm({ name: '', area: '' }); setShowModal(true); }}>+ Add Route</button>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {routes.length === 0 ? (
                    <div className="empty-state"><div className="icon"><IconMap size={40} /></div><h3>No routes yet</h3><p>Add your first delivery route</p></div>
                ) : routes.map((r) => (
                    <div className="glass-card" key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconMap size={20} /></div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{r.name}</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>{r.area || 'No area specified'}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Route">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Route Name *</label>
                        <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Area Description</label>
                        <input className="form-control" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Route</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
