'use client';
import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';

export default function PurchasesPage() {
    const [purchases, setPurchases] = useState([]);
    const [wholesalers, setWholesalers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [form, setForm] = useState({ wholesaler_id: '', product_id: '', purchase_date: '', quantity: '', cost_price: '' });

    const fetchPurchases = async () => {
        try {
            let url = '/api/purchases?';
            if (filterDate) url += `date=${filterDate}&`;
            const res = await fetch(url);
            setPurchases(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchMasterData = async () => {
        try {
            const [wsRes, prodRes] = await Promise.all([
                fetch('/api/wholesalers'), fetch('/api/products'),
            ]);
            setWholesalers(await wsRes.json());
            setProducts(await prodRes.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchMasterData(); }, []);
    useEffect(() => { if (!loading) fetchPurchases(); }, [filterDate, loading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/purchases', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            showToast('Purchase recorded');
            setShowModal(false);
            fetchPurchases();
        } catch (e) { showToast('Error recording purchase', 'error'); }
    };

    const totalCost = purchases.reduce((s, p) => s + parseFloat(p.quantity) * parseFloat(p.cost_price), 0);

    if (loading) return <div className="spinner" />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Purchases</h2>
                    <p>Record incoming inventory from wholesalers</p>
                </div>
                <button className="btn btn-primary" onClick={() => {
                    setForm({ wholesaler_id: '', product_id: '', purchase_date: filterDate, quantity: '', cost_price: '' });
                    setShowModal(true);
                }}>+ Add Purchase</button>
            </div>

            <div className="filters-bar">
                <input className="form-control" type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ width: 180 }} />
                <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'var(--muted)' }}>
                    Total Cost: <strong style={{ color: '#fbbf24' }}>₹{totalCost.toFixed(2)}</strong>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Wholesaler</th>
                            <th>Product</th>
                            <th>Company</th>
                            <th>Qty</th>
                            <th>Cost/Unit (₹)</th>
                            <th>Total (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchases.length === 0 ? (
                            <tr><td colSpan={6}><div className="empty-state"><div className="icon">📦</div><h3>No purchases for this date</h3></div></td></tr>
                        ) : purchases.map((p) => (
                            <tr key={p.id}>
                                <td style={{ fontWeight: 600 }}>{p.wholesaler_name}</td>
                                <td>{p.product_name}</td>
                                <td><span className="badge badge-info">{p.company_name}</span></td>
                                <td>{parseFloat(p.quantity)}</td>
                                <td>₹{parseFloat(p.cost_price).toFixed(2)}</td>
                                <td style={{ fontWeight: 600, color: '#fbbf24' }}>₹{(parseFloat(p.quantity) * parseFloat(p.cost_price)).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Purchase">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Wholesaler *</label>
                        <select className="form-control" required value={form.wholesaler_id} onChange={(e) => setForm({ ...form, wholesaler_id: e.target.value })}>
                            <option value="">Select Wholesaler</option>
                            {wholesalers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Product *</label>
                        <select className="form-control" required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                            <option value="">Select Product</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Date *</label>
                            <input className="form-control" type="date" required value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Quantity *</label>
                            <input className="form-control" type="number" step="0.5" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Cost/Unit (₹) *</label>
                            <input className="form-control" type="number" step="0.01" required value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Purchase</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
