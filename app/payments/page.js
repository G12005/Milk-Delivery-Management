'use client';
import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import { IconCreditCard } from '../components/Icons';

export default function PaymentsPage() {
    const [payments, setPayments] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [bills, setBills] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        bill_id: '', customer_id: '', amount: '', mode: 'cash',
        bank_account_id: '', payment_date: new Date().toISOString().split('T')[0], notes: '',
    });

    const fetchData = async () => {
        try {
            const [payRes, custRes, billRes, bankRes] = await Promise.all([
                fetch('/api/payments'), fetch('/api/customers?limit=500'),
                fetch('/api/bills?status=pending'), fetch('/api/bank-accounts'),
            ]);
            const payData = await payRes.json();
            setPayments(Array.isArray(payData) ? payData : []);
            const custData = await custRes.json();
            setCustomers(Array.isArray(custData) ? custData : (custData?.customers || []));
            const billData = await billRes.json();
            setBills(Array.isArray(billData) ? billData : []);
            const bankData = await bankRes.json();
            setBankAccounts(Array.isArray(bankData) ? bankData : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const onBillChange = (billId) => {
        const bill = bills.find((b) => String(b.id) === billId);
        if (bill) {
            const due = parseFloat(bill.total_amount) - parseFloat(bill.paid_amount);
            setForm((prev) => ({ ...prev, bill_id: billId, customer_id: String(bill.customer_id), amount: due.toFixed(2) }));
        } else {
            setForm((prev) => ({ ...prev, bill_id: billId }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/payments', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    bill_id: form.bill_id || null,
                    bank_account_id: form.bank_account_id || null,
                }),
            });
            showToast('Payment recorded');
            setShowModal(false);
            fetchData();
        } catch (e) { showToast('Error recording payment', 'error'); }
    };

    const totalReceived = payments.reduce((s, p) => s + parseFloat(p.amount), 0);

    if (loading) return <div className="spinner" />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Payments</h2>
                    <p>Record and track all payments received</p>
                </div>
                <button className="btn btn-success" onClick={() => {
                    setForm({ bill_id: '', customer_id: '', amount: '', mode: 'cash', bank_account_id: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
                    setShowModal(true);
                }}>+ Record Payment</button>
            </div>

            <div className="filters-bar">
                <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'var(--muted)' }}>
                    Total Received: <strong style={{ color: '#34d399', fontSize: '1.05rem' }}>₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Bill #</th>
                            <th>Period</th>
                            <th>Amount (₹)</th>
                            <th>Mode</th>
                            <th>Bank</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.length === 0 ? (
                            <tr><td colSpan={8}><div className="empty-state"><div className="icon"><IconCreditCard size={40} /></div><h3>No payments recorded</h3></div></td></tr>
                        ) : payments.map((p) => (
                            <tr key={p.id}>
                                <td>{p.payment_date}</td>
                                <td style={{ fontWeight: 600 }}>{p.customer_name}</td>
                                <td>{p.bill_id ? `#${p.bill_id}` : '—'}</td>
                                <td style={{ fontSize: '0.82rem' }}>{p.period_start && p.period_end ? `${p.period_start} → ${p.period_end}` : '—'}</td>
                                <td style={{ fontWeight: 700, color: '#34d399' }}>₹{parseFloat(p.amount).toFixed(2)}</td>
                                <td><span className="badge badge-info">{p.mode}</span></td>
                                <td>{p.bank_name || '—'}</td>
                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--muted)' }}>{p.notes || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Payment">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Against Bill (Optional)</label>
                        <select className="form-control" value={form.bill_id} onChange={(e) => onBillChange(e.target.value)}>
                            <option value="">No specific bill</option>
                            {bills.map((b) => (
                                <option key={b.id} value={b.id}>
                                    #{b.id} — {b.customer_name} — Due: ₹{(parseFloat(b.total_amount) - parseFloat(b.paid_amount)).toFixed(2)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Customer *</label>
                        <select className="form-control" required value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                            <option value="">Select Customer</option>
                            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Amount (₹) *</label>
                            <input className="form-control" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Payment Date *</label>
                            <input className="form-control" type="date" required value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Payment Mode</label>
                            <select className="form-control" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Bank Account</label>
                            <select className="form-control" value={form.bank_account_id} onChange={(e) => setForm({ ...form, bank_account_id: e.target.value })}>
                                <option value="">Not Applicable</option>
                                {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bank_name} — {b.account_number}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Notes</label>
                        <input className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-success">Record Payment</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
