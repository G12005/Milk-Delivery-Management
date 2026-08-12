'use client';
import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';

export default function AgentsPage() {
    const [agents, setAgents] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', route_ids: [] });

    const fetchData = async () => {
        try {
            const [agentRes, routeRes] = await Promise.all([
                fetch('/api/agents'), fetch('/api/routes'),
            ]);
            setAgents(await agentRes.json());
            setRoutes(await routeRes.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/agents', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            showToast('Agent added successfully');
            setShowModal(false);
            fetchData();
        } catch (e) { showToast('Error adding agent', 'error'); }
    };

    const toggleRoute = (routeId) => {
        setForm((prev) => ({
            ...prev,
            route_ids: prev.route_ids.includes(routeId)
                ? prev.route_ids.filter((id) => id !== routeId)
                : [...prev.route_ids, routeId],
        }));
    };

    if (loading) return <div className="spinner" />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Delivery Agents</h2>
                    <p>Manage agents and their route assignments</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setForm({ name: '', phone: '', route_ids: [] }); setShowModal(true); }}>+ Add Agent</button>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                {agents.length === 0 ? (
                    <div className="empty-state"><div className="icon">🚚</div><h3>No agents yet</h3></div>
                ) : agents.map((a) => (
                    <div className="glass-card" key={a.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🚚</div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{a.name}</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>{a.phone || 'No phone'}</p>
                            </div>
                            <span className={`badge ${a.is_active ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 'auto' }}>{a.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {a.assigned_routes?.length > 0 ? a.assigned_routes.map((r) => (
                                <span key={r.route_id} className="badge badge-info">{r.route_name}</span>
                            )) : <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>No routes assigned</span>}
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Agent">
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Name *</label>
                            <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Assign Routes</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {routes.map((r) => (
                                <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: form.route_ids.includes(r.id) ? 'rgba(59,130,246,0.2)' : 'var(--background)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input type="checkbox" checked={form.route_ids.includes(r.id)} onChange={() => toggleRoute(r.id)} style={{ display: 'none' }} />
                                    {form.route_ids.includes(r.id) ? '✅' : '⬜'} {r.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Agent</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
