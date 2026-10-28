'use client';
import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import { IconChevronUp, IconChevronDown, IconEdit, IconTrash, IconUsers, IconPlus } from '../components/Icons';

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
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [form, setForm] = useState({
        name: '', phone: '', address: '', route_id: '', agent_id: '',
        billing_cycle: '1-to-last', payment_type: 'postpaid',
        subscriptions: [{ product_id: '', quantity: 1 }],
    });

    const fetchData = async () => {
        try {
            const [custRes, routeRes, agentRes, prodRes] = await Promise.all([
                fetch(`/api/customers?page=1&limit=500`),
                fetch('/api/routes'),
                fetch('/api/agents'),
                fetch('/api/products'),
            ]);

            const customerData = await custRes.json();
            setCustomers(Array.isArray(customerData) ? customerData : (customerData?.customers || []));
            const routeData = await routeRes.json();
            setRoutes(Array.isArray(routeData) ? routeData : (routeData?.routes || []));
            const agentData = await agentRes.json();
            setAgents(Array.isArray(agentData) ? agentData : (agentData?.agents || []));
            const prodData = await prodRes.json();
            setProducts(Array.isArray(prodData) ? prodData : (prodData?.products || []));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const normalizeDisplayOrder = (value, fallback) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    const moveCustomer = async (customerId, direction) => {
        const customerList = Array.isArray(customers) ? customers : [];
        const currentCustomer = customerList.find((customer) => customer?.id === customerId);
        if (!currentCustomer) return;

        const routeCustomers = customerList.filter((customer) => String(customer?.route_id || '') === String(currentCustomer.route_id || ''));
        const currentIndex = routeCustomers.findIndex((customer) => customer?.id === customerId);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const targetCustomer = routeCustomers[targetIndex];
        if (!targetCustomer) return;

        const currentOrder = normalizeDisplayOrder(currentCustomer.display_order, currentIndex * 100 + 10);
        const targetOrder = normalizeDisplayOrder(targetCustomer.display_order, targetIndex * 100 + 10);

        try {
            const responses = await Promise.all([
                fetch(`/api/customers/${customerId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ display_order: targetOrder }),
                }),
                fetch(`/api/customers/${targetCustomer.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ display_order: currentOrder }),
                })
            ]);
            if (responses.some((response) => !response.ok)) throw new Error('Reorder request failed');

            setCustomers((prev) => {
                const next = Array.isArray(prev) ? [...prev] : [];
                const currentPosition = next.findIndex((customer) => customer?.id === customerId);
                const targetPosition = next.findIndex((customer) => customer?.id === targetCustomer.id);
                if (currentPosition === -1 || targetPosition === -1) return prev;

                [next[currentPosition], next[targetPosition]] = [
                    { ...next[targetPosition], display_order: currentOrder },
                    { ...next[currentPosition], display_order: targetOrder },
                ];
                return next;
            });

            showToast(direction === 'up' ? 'Customer moved up' : 'Customer moved down');
        } catch (error) {
            console.error('Failed to reorder customer:', error);
            showToast('Could not reorder customer', 'error');
        }
    };

    const openAdd = () => {
        setEditing(null);
        const prodList = Array.isArray(products) ? products : [];
        setForm({
            name: '', phone: '', address: '', route_id: '', agent_id: '',
            billing_cycle: '1-to-last', payment_type: 'postpaid',
            subscriptions: [{ product_id: prodList[0]?.id || '', quantity: 1 }],
        });
        setShowModal(true);
    };

    const openEdit = (c) => {
        setEditing(c);
        const prodList = Array.isArray(products) ? products : [];
        let subs = [];
        if (Array.isArray(c?.parsed_subscriptions) && c.parsed_subscriptions.length > 0) {
            subs = c.parsed_subscriptions.map(s => ({ product_id: s?.product_id || '', quantity: s?.quantity || 1 }));
        } else if (c?.subscribed_product_id) {
            subs = [{ product_id: c.subscribed_product_id, quantity: c.subscribed_quantity || 1 }];
        } else {
            subs = [{ product_id: prodList[0]?.id || '', quantity: 1 }];
        }

        setForm({
            name: c?.name || '', phone: c?.phone || '', address: c?.address || '',
            route_id: c?.route_id || '', agent_id: c?.agent_id || '',
            billing_cycle: c?.billing_cycle || '1-to-last', payment_type: c?.payment_type || 'postpaid',
            subscriptions: subs,
        });
        setShowModal(true);
    };

    const handleSubChange = (index, field, value) => {
        const updated = Array.isArray(form.subscriptions) ? [...form.subscriptions] : [];
        updated[index] = { ...updated[index], [field]: field === 'quantity' ? parseFloat(value) || 0 : value };
        setForm({ ...form, subscriptions: updated });
    };

    const addSubRow = () => {
        const prodList = Array.isArray(products) ? products : [];
        setForm({
            ...form,
            subscriptions: [...(form.subscriptions || []), { product_id: prodList[0]?.id || '', quantity: 1 }]
        });
    };

    const removeSubRow = (index) => {
        if (!form.subscriptions || form.subscriptions.length <= 1) return;
        setForm({
            ...form,
            subscriptions: form.subscriptions.filter((_, i) => i !== index)
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const validSubs = (form.subscriptions || []).filter(s => s?.product_id);
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

    const customerList = Array.isArray(customers) ? customers : [];
    const routeList = Array.isArray(routes) ? routes : [];
    const agentList = Array.isArray(agents) ? agents : [];
    const prodList = Array.isArray(products) ? products : [];

    const filtered = customerList.filter((c) => {
        if (!c) return false;
        const name = String(c.name || '');
        const address = String(c.address || '');
        const phone = String(c.phone || '');
        const matchSearch = name.toLowerCase().includes(search.toLowerCase()) ||
            phone.includes(search) || address.toLowerCase().includes(search.toLowerCase());
        const matchRoute = !filterRoute || String(c.route_id) === filterRoute;
        return matchSearch && matchRoute;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

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
                <input className="form-control search-input" placeholder="Search customers..." value={search} onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                }} />
                <select className="form-control" value={filterRoute} onChange={(e) => {
                    setFilterRoute(e.target.value);
                    setPage(1);
                }}>
                    <option value="">All Routes</option>
                    {routeList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select className="form-control" value={pageSize} onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                }}>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                </select>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Order</th>
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
                        {paginated.length === 0 ? (
                            <tr><td colSpan={10}><div className="empty-state"><div className="icon"><IconUsers size={40} /></div><h3>No customers found</h3></div></td></tr>
                        ) : paginated.map((c, index) => (
                            <tr key={c.id}>
                                <td>{(safePage - 1) * pageSize + index + 1}</td>
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
                                        <button
                                            className="btn-icon"
                                            onClick={() => moveCustomer(c.id, 'up')}
                                            title="Move up"
                                            disabled={customerList.filter((customer) => String(customer?.route_id || '') === String(c?.route_id || '')).findIndex((customer) => customer?.id === c?.id) === 0}
                                        ><IconChevronUp size={14} /></button>
                                        <button
                                            className="btn-icon"
                                            onClick={() => moveCustomer(c.id, 'down')}
                                            title="Move down"
                                            disabled={customerList.filter((customer) => String(customer?.route_id || '') === String(c?.route_id || '')).findIndex((customer) => customer?.id === c?.id) === customerList.filter((customer) => String(customer?.route_id || '') === String(c?.route_id || '')).length - 1}
                                        ><IconChevronDown size={14} /></button>
                                        <button className="btn-icon" onClick={() => openEdit(c)} title="Edit"><IconEdit size={14} /></button>
                                        <button className="btn-icon" onClick={() => handleDelete(c.id)} title="Delete"><IconTrash size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filtered.length > 0 && (
                <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ color: 'var(--muted)' }}>
                        Showing {(filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1)}-{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button className="btn btn-secondary" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
                        <span style={{ minWidth: 80, textAlign: 'center', color: 'var(--muted)' }}>Page {safePage} / {totalPages}</span>
                        <button className="btn btn-secondary" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
                    </div>
                </div>
            )}

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
                        {(form.subscriptions || []).map((sub, idx) => (
                            <div key={idx} className="form-row" style={{ marginBottom: 8, alignItems: 'center' }}>
                                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                                    <select className="form-control" required value={sub.product_id} onChange={(e) => handleSubChange(idx, 'product_id', e.target.value)}>
                                        <option value="">Select Product</option>
                                        {prodList.map(p => <option key={p.id} value={p.id}>{p.name} (₹{(parseFloat(p.price) || 0).toFixed(2)})</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <input className="form-control" type="number" step="0.5" min="0.5" required placeholder="Qty" value={sub.quantity} onChange={(e) => handleSubChange(idx, 'quantity', e.target.value)} />
                                </div>
                                {(form.subscriptions || []).length > 1 && (
                                    <button type="button" className="btn-icon" onClick={() => removeSubRow(idx)} style={{ marginTop: 0 }}><IconTrash size={14} /></button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Route</label>
                            <select className="form-control" value={form.route_id} onChange={(e) => setForm({ ...form, route_id: e.target.value })}>
                                <option value="">Select Route</option>
                                {routeList.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Agent</label>
                            <select className="form-control" value={form.agent_id} onChange={(e) => setForm({ ...form, agent_id: e.target.value })}>
                                <option value="">Select Agent</option>
                                {agentList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
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
