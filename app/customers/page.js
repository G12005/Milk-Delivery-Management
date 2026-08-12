'use client';
import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [agents, setAgents] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [filterRoute, setFilterRoute] = useState('');

    const [form, setForm] = useState({
        name: '', phone: '', address: '', route_id: '', agent_id: '',
        billing_cycle: '1-to-last', payment_type: 'postpaid',
        subscriptions: [{ product_id: '', quantity: 1 }],
    });

    const fetchData = async () => {
        try {
            const [custRes, routeRes, agentRes, prodRes] = await Promise.all([
                fetch('/api/customers'), fetch('/api/routes'), fetch('/api/agents'), fetch('/api/products'),
            ]);
            setCustomers(await custRes.json());
            setRoutes(await routeRes.json());
            setAgents(await agentRes.json());
            setProducts(await prodRes.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const openAdd = () => {
        setEditing(null);
        setForm({
            name: '', phone: '', address: '', route_id: '', agent_id: '',
            billing_cycle: '1-to-last', payment_type: 'postpaid',
            subscriptions: [{ product_id: products[0]?.id || '', quantity: 1 }],
        });
        setShowModal(true);
    };

    const openEdit = (c) => {
        setEditing(c);
        let subs = [];
        if (c.parsed_subscriptions && c.parsed_subscriptions.length > 0) {
            subs = c.parsed_subscriptions.map(s => ({ product_id: s.product_id, quantity: s.quantity }));
        } else if (c.subscribed_product_id) {
            subs = [{ product_id: c.subscribed_product_id, quantity: c.subscribed_quantity || 1 }];
        } else {
            subs = [{ product_id: products[0]?.id || '', quantity: 1 }];
        }

        setForm({
            name: c.name, phone: c.phone || '', address: c.address || '',
            route_id: c.route_id || '', agent_id: c.agent_id || '',
            billing_cycle: c.billing_cycle, payment_type: c.payment_type,
            subscriptions: subs,
        });
        setShowModal(true);
    };

    const handleSubChange = (index, field, value) => {
        const updated = [...form.subscriptions];
        updated[index] = { ...updated[index], [field]: field === 'quantity' ? parseFloat(value) || 0 : value };
        setForm({ ...form, subscriptions: updated });
    };

    const addSubRow = () => {
        setForm({
            ...form,
            subscriptions: [...form.subscriptions, { product_id: products[0]?.id || '', quantity: 1 }]
        });
    };

    const removeSubRow = (index) => {
        if (form.subscriptions.length <= 1) return;
        setForm({
            ...form,
            subscriptions: form.subscriptions.filter((_, i) => i !== index)
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const validSubs = form.subscriptions.filter(s => s.product_id);
            const primarySub = validSubs[0] || {};
            const payload = {
                ...form,
                route_id: form.route_id || null,
                agent_id: form.agent_id || null,
                subscriptions: JSON.stringify(validSubs),
                subscribed_product_id: primarySub.product_id || null,
                subscribed_quantity: primarySub.quantity || 1.0,
            };

            if (editing) {
                await fetch(`/api/customers/${editing.id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, is_active: true }),
                });
                showToast('Customer updated successfully');
            } else {
                await fetch('/api/customers', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                showToast('Customer added successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (e) { showToast('Error saving customer', 'error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this customer?')) return;
        await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        showToast('Customer deleted');
        fetchData();
    };

    const filtered = customers.filter((c) => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.phone?.includes(search) || c.address?.toLowerCase().includes(search.toLowerCase());
        const matchRoute = !filterRoute || String(c.route_id) === filterRoute;
        return matchSearch && matchRoute;
    });

    if (loading) return <div className="spinner" />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Customers</h2>
                    <p>Manage customer directory & subscribed daily milk quantities</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Customer</button>
            </div>

            <div className="filters-bar">
                <input className="form-control search-input" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="form-control" value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)}>
                    <option value="">All Routes</option>
                    {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Subscribed Products & Qty</th>
                            <th>Phone</th>
                            <th>Address</th>
                            <th>Route</th>
                            <th>Agent</th>
                            <th>Billing</th>
                            <th>Type</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={9}><div className="empty-state"><div className="icon">👥</div><h3>No customers found</h3></div></td></tr>
                        ) : filtered.map((c) => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 600 }}>{c.name}</td>
                                <td>
                                    {c.parsed_subscriptions && c.parsed_subscriptions.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {c.parsed_subscriptions.map((sub, idx) => (
                                                <div key={idx} style={{ fontSize: '0.85rem' }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{sub.product_name || 'Product'}</span>
                                                    <span className="badge badge-info" style={{ marginLeft: 6 }}>{sub.quantity} {sub.unit || 'pkt'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>—</span>
                                    )}
                                </td>
                                <td>{c.phone || '—'}</td>
                                <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.address || '—'}</td>
                                <td><span className="badge badge-info">{c.route_name || '—'}</span></td>
                                <td>{c.agent_name || '—'}</td>
                                <td><span className="badge badge-neutral">{c.billing_cycle}</span></td>
                                <td><span className={`badge ${c.payment_type === 'prepaid' ? 'badge-success' : 'badge-warning'}`}>{c.payment_type}</span></td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn-icon" onClick={() => openEdit(c)} title="Edit">✏️</button>
                                        <button className="btn-icon" onClick={() => handleDelete(c.id)} title="Delete">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
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
                        <label>Address</label>
                        <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>

                    <div style={{ background: 'var(--background)', padding: 12, borderRadius: 8, marginBottom: 14, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <label style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Subscribed Products & Daily Quantities *</label>
                            <button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.78rem' }} onClick={addSubRow}>+ Add Product</button>
                        </div>
                        {form.subscriptions.map((sub, idx) => (
                            <div key={idx} className="form-row" style={{ marginBottom: 8, alignItems: 'center' }}>
                                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                                    <select className="form-control" required value={sub.product_id} onChange={(e) => handleSubChange(idx, 'product_id', e.target.value)}>
                                        <option value="">Select Product</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (₹{parseFloat(p.price).toFixed(2)})</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <input className="form-control" type="number" step="0.5" min="0.5" required placeholder="Qty" value={sub.quantity} onChange={(e) => handleSubChange(idx, 'quantity', e.target.value)} />
                                </div>
                                {form.subscriptions.length > 1 && (
                                    <button type="button" className="btn-icon" onClick={() => removeSubRow(idx)} style={{ marginTop: 0 }}>🗑️</button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Route</label>
                            <select className="form-control" value={form.route_id} onChange={(e) => setForm({ ...form, route_id: e.target.value })}>
                                <option value="">Select Route</option>
                                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Agent</label>
                            <select className="form-control" value={form.agent_id} onChange={(e) => setForm({ ...form, agent_id: e.target.value })}>
                                <option value="">Select Agent</option>
                                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Billing Cycle</label>
                            <select className="form-control" value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}>
                                <option value="1-to-last">1st to Last (Month)</option>
                                <option value="11-to-10">11th to 10th</option>
                                <option value="daily">Daily</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Payment Type</label>
                            <select className="form-control" value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })}>
                                <option value="postpaid">Postpaid</option>
                                <option value="prepaid">Prepaid</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add'} Customer</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
