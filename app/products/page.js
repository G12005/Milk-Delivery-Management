'use client';
import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [editPrice, setEditPrice] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [form, setForm] = useState({ company_id: '', name: '', unit: 'packet', price: '' });

    const fetchData = async () => {
        try {
            const [prodRes, compRes] = await Promise.all([
                fetch('/api/products'), fetch('/api/companies'),
            ]);
            setProducts(await prodRes.json());
            setCompanies(await compRes.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/products', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            showToast('Product added successfully');
            setShowModal(false);
            fetchData();
        } catch (e) { showToast('Error adding product', 'error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this product?')) return;
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        showToast('Product deleted');
        fetchData();
    };

    const openEdit = (p) => {
        setEditProduct(p);
        setEditPrice(p.price);
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editProduct) return;
        try {
            await fetch(`/api/products/${editProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: parseFloat(editPrice) })
            });
            showToast('Price updated');
            setShowEditModal(false);
            fetchData();
        } catch (err) {
            showToast('Error updating price', 'error');
        }
    };

    const filtered = filterCompany ? products.filter((p) => String(p.company_id) === filterCompany) : products;

    if (loading) return <div className="spinner" />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Products</h2>
                    <p>Manage milk products from all companies</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setForm({ company_id: '', name: '', unit: 'packet', price: '' }); setShowModal(true); }}>+ Add Product</button>
            </div>

            <div className="filters-bar">
                <select className="form-control" value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
                    <option value="">All Companies</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Company</th>
                            <th>Unit</th>
                            <th>Price (₹)</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6}><div className="empty-state"><div className="icon">🥛</div><h3>No products found</h3></div></td></tr>
                        ) : filtered.map((p) => (
                            <tr key={p.id}>
                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                <td><span className="badge badge-info">{p.company_name}</span></td>
                                <td>{p.unit}</td>
                                <td>₹{parseFloat(p.price).toFixed(2)}</td>
                                <td><span className={`badge ${p.is_active ? 'badge-success' : 'badge-danger'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                    <button className="btn-icon" onClick={() => openEdit(p)} title="Edit price">✏️</button>
                                    <button className="btn-icon" onClick={() => handleDelete(p.id)} title="Delete">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Product">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Company *</label>
                        <select className="form-control" required value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                            <option value="">Select Company</option>
                            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Product Name *</label>
                        <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Unit</label>
                            <select className="form-control" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                                <option value="packet">Packet</option>
                                <option value="litre">Litre</option>
                                <option value="kg">Kg</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Price (₹) *</label>
                            <input className="form-control" type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Product</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Product Price">
                <form onSubmit={handleEditSubmit}>
                    <div className="form-group">
                        <label>Product</label>
                        <input className="form-control" value={editProduct?.name || ''} disabled />
                    </div>
                    <div className="form-group">
                        <label>Price (₹) *</label>
                        <input className="form-control" type="number" step="0.01" required value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
