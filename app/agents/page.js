'use client';
import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import { IconTruck, IconEdit, IconCheck, IconSquare, IconCheckSquare } from '../components/Icons';

export default function AgentsPage() {
    const [agents, setAgents] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editAgent, setEditAgent] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', phone: '', route_ids: [], is_active: true });
    const [form, setForm] = useState({ name: '', phone: '', route_ids: [] });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savingAgentId, setSavingAgentId] = useState(null);

    const fetchData = async () => {
        try {
            const [agentRes, routeRes] = await Promise.all([
                fetch('/api/agents'), fetch('/api/routes'),
            ]);
            const agentData = await agentRes.json();
            setAgents(Array.isArray(agentData) ? agentData : []);
            const routeData = await routeRes.json();
            setRoutes(Array.isArray(routeData) ? routeData : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await fetch('/api/agents', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            showToast('Agent added successfully');
            setShowModal(false);
            fetchData();
        } catch (e) { showToast('Error adding agent', 'error'); }
        setIsSubmitting(false);
    };

    const openEdit = (a) => {
        setEditAgent(a);
        setEditForm({ name: a.name || '', phone: a.phone || '', route_ids: (a.assigned_routes || []).map(r => r.route_id), is_active: a.is_active !== false });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editAgent) return;
        if (savingAgentId) return;
        setSavingAgentId(editAgent.id);
        try {
            await fetch(`/api/agents/${editAgent.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            showToast('Agent updated');
            setShowEditModal(false);
            fetchData();
        } catch (e) { showToast('Error updating agent', 'error'); }
        setSavingAgentId(null);
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
                    <div className="empty-state"><div className="icon"><IconTruck size={40} /></div><h3>No agents yet</h3></div>
                ) : agents.map((a) => (
                    <div className="glass-card" key={a.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconTruck size={20} /></div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{a.name}</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>{a.phone || 'No phone'}</p>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button className="btn-icon" onClick={() => openEdit(a)} title="Edit agent" disabled={savingAgentId === a.id}><IconEdit size={14} /></button>
                                <span className={`badge ${a.is_active ? 'badge-success' : 'badge-danger'}`}>{a.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
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
                                <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: form.route_ids.includes(r.id) ? '#eff6ff' : '#f9fafb', border: `1px solid ${form.route_ids.includes(r.id) ? '#bfdbfe' : 'var(--border)'}`, cursor: 'pointer', fontSize: '0.85rem', color: form.route_ids.includes(r.id) ? '#2563eb' : 'var(--foreground)' }}>
                                    <input type="checkbox" checked={form.route_ids.includes(r.id)} onChange={() => toggleRoute(r.id)} style={{ display: 'none' }} />
                                    {form.route_ids.includes(r.id) ? <IconCheckSquare size={14} /> : <IconSquare size={14} />} {r.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Add Agent'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Agent">
                <form onSubmit={handleEditSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Name *</label>
                            <input className="form-control" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input className="form-control" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Assign Routes</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {routes.map((r) => (
                                <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: editForm.route_ids.includes(r.id) ? '#eff6ff' : '#f9fafb', border: `1px solid ${editForm.route_ids.includes(r.id) ? '#bfdbfe' : 'var(--border)'}`, cursor: 'pointer', fontSize: '0.85rem', color: editForm.route_ids.includes(r.id) ? '#2563eb' : 'var(--foreground)' }}>
                                    <input type="checkbox" checked={editForm.route_ids.includes(r.id)} onChange={() => setEditForm((prev) => ({ ...prev, route_ids: prev.route_ids.includes(r.id) ? prev.route_ids.filter((id) => id !== r.id) : [...prev.route_ids, r.id] }))} style={{ display: 'none' }} />
                                    {editForm.route_ids.includes(r.id) ? <IconCheckSquare size={14} /> : <IconSquare size={14} />} {r.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Active</label>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={!!editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} /> Active
                            </label>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={!!savingAgentId}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={!!savingAgentId}>{savingAgentId ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
