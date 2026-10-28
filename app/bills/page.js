'use client';
import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import { IconReceipt, IconZap, IconEye, IconTrash } from '../components/Icons';

export default function BillsPage() {
    const [bills, setBills] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGenerate, setShowGenerate] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [genForm, setGenForm] = useState({ customer_id: '', period_start: '', period_end: '' });

    const fetchBills = async () => {
        try {
            let url = '/api/bills?';
            if (filterStatus) url += `status=${filterStatus}&`;
            const res = await fetch(url);
            const data = await res.json();
            setBills(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers?limit=500');
            const data = await res.json();
            setCustomers(Array.isArray(data) ? data : (data?.customers || []));
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchCustomers(); }, []);
    useEffect(() => { if (!loading) fetchBills(); }, [filterStatus, loading]);

    const handleGenerate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/bills', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(genForm),
            });
            const data = await res.json();
            if (res.ok) {
                showToast(`Bill #${data.id} generated — ₹${parseFloat(data.total_amount).toFixed(2)}`);
                setShowGenerate(false);
                fetchBills();
            } else {
                showToast(data.error || 'Error generating bill', 'error');
            }
        } catch (e) { showToast('Error generating bill', 'error'); }
    };

    const viewBill = async (id) => {
        try {
            const res = await fetch(`/api/bills/${id}`);
            setShowDetail(await res.json());
        } catch (e) { console.error(e); }
    };

    const deleteBill = async (id) => {
        if (!confirm('Delete this bill and its items?')) return;
        await fetch(`/api/bills/${id}`, { method: 'DELETE' });
        showToast('Bill deleted');
        fetchBills();
    };

    const statusBadge = (s) => {
        const map = { paid: 'badge-success', partial: 'badge-warning', pending: 'badge-danger' };
        return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s}</span>;
    };

    // Auto-set period based on customer billing cycle
    const onCustomerChange = (customerId) => {
        const customer = customers.find((c) => String(c.id) === customerId);
        if (!customer) { setGenForm({ ...genForm, customer_id: customerId }); return; }

        const now = new Date();
        let start, end;
        if (customer.billing_cycle === '1-to-last') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (customer.billing_cycle === '11-to-10') {
            if (now.getDate() > 10) {
                start = new Date(now.getFullYear(), now.getMonth() - 1, 11);
                end = new Date(now.getFullYear(), now.getMonth(), 10);
            } else {
                start = new Date(now.getFullYear(), now.getMonth() - 2, 11);
                end = new Date(now.getFullYear(), now.getMonth() - 1, 10);
            }
        } else {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        }
        setGenForm({
            customer_id: customerId,
            period_start: start.toISOString().split('T')[0],
            period_end: end.toISOString().split('T')[0],
        });
    };

    if (loading) return <div className="spinner" />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Bills</h2>
                    <p>Generate &amp; manage customer bills</p>
                </div>
                <button className="btn btn-success" onClick={() => { setGenForm({ customer_id: '', period_start: '', period_end: '' }); setShowGenerate(true); }}><IconZap size={14} /> Generate Bill</button>
            </div>

            <div className="filters-bar">
                <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                </select>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Bill #</th>
                            <th>Customer</th>
                            <th>Period</th>
                            <th>Billing Cycle</th>
                            <th>Type</th>
                            <th>Total (₹)</th>
                            <th>Paid (₹)</th>
                            <th>Due (₹)</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bills.length === 0 ? (
                            <tr><td colSpan={10}><div className="empty-state"><div className="icon"><IconReceipt size={40} /></div><h3>No bills found</h3></div></td></tr>
                        ) : bills.map((b) => (
                            <tr key={b.id}>
                                <td style={{ fontWeight: 600 }}>#{b.id}</td>
                                <td>{b.customer_name}</td>
                                <td style={{ fontSize: '0.82rem' }}>{b.period_start} → {b.period_end}</td>
                                <td><span className="badge badge-neutral">{b.billing_cycle}</span></td>
                                <td><span className={`badge ${b.payment_type === 'prepaid' ? 'badge-success' : 'badge-warning'}`}>{b.payment_type}</span></td>
                                <td>₹{parseFloat(b.total_amount).toFixed(2)}</td>
                                <td>₹{parseFloat(b.paid_amount).toFixed(2)}</td>
                                <td style={{ fontWeight: 600, color: parseFloat(b.total_amount) - parseFloat(b.paid_amount) > 0 ? '#f87171' : '#34d399' }}>
                                    ₹{(parseFloat(b.total_amount) - parseFloat(b.paid_amount)).toFixed(2)}
                                </td>
                                <td>{statusBadge(b.status)}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn-icon" onClick={() => viewBill(b.id)} title="View Details"><IconEye size={14} /></button>
                                        <button className="btn-icon" onClick={() => deleteBill(b.id)} title="Delete"><IconTrash size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Generate Bill Modal */}
            <Modal isOpen={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Bill">
                <form onSubmit={handleGenerate}>
                    <div className="form-group">
                        <label>Customer *</label>
                        <select className="form-control" required value={genForm.customer_id} onChange={(e) => onCustomerChange(e.target.value)}>
                            <option value="">Select Customer</option>
                            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.billing_cycle})</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Period Start *</label>
                            <input className="form-control" type="date" required value={genForm.period_start} onChange={(e) => setGenForm({ ...genForm, period_start: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Period End *</label>
                            <input className="form-control" type="date" required value={genForm.period_end} onChange={(e) => setGenForm({ ...genForm, period_end: e.target.value })} />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowGenerate(false)}>Cancel</button>
                        <button type="submit" className="btn btn-success"><IconZap size={14} /> Generate</button>
                    </div>
                </form>
            </Modal>

            {/* Bill Detail Modal */}
            <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail ? `Bill #${showDetail.id}` : ''}>
                {showDetail && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, fontSize: '0.88rem' }}>
                            <div><span style={{ color: 'var(--muted)' }}>Customer:</span> <strong>{showDetail.customer_name}</strong></div>
                            <div><span style={{ color: 'var(--muted)' }}>Phone:</span> {showDetail.customer_phone}</div>
                            <div><span style={{ color: 'var(--muted)' }}>Period:</span> {showDetail.period_start} → {showDetail.period_end}</div>
                            <div><span style={{ color: 'var(--muted)' }}>Address:</span> {showDetail.customer_address}</div>
                        </div>

                        <h4 style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 8 }}>Bill Items</h4>
                        <div className="table-container" style={{ marginBottom: 20 }}>
                            <table className="data-table">
                                <thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                                <tbody>
                                    {showDetail.items?.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.product_name}</td>
                                            <td>{parseFloat(item.total_qty)}</td>
                                            <td>₹{parseFloat(item.rate).toFixed(2)}</td>
                                            <td style={{ fontWeight: 600 }}>₹{parseFloat(item.amount).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ borderTop: '2px solid var(--border)' }}>
                                        <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Total</td>
                                        <td style={{ fontWeight: 700, color: '#34d399', fontSize: '1.05rem' }}>₹{parseFloat(showDetail.total_amount).toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {showDetail.payments?.length > 0 && (
                            <>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 8 }}>Payments</h4>
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Bank</th></tr></thead>
                                        <tbody>
                                            {showDetail.payments.map((p) => (
                                                <tr key={p.id}>
                                                    <td>{p.payment_date}</td>
                                                    <td style={{ fontWeight: 600 }}>₹{parseFloat(p.amount).toFixed(2)}</td>
                                                    <td><span className="badge badge-info">{p.mode}</span></td>
                                                    <td>{p.bank_name || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
