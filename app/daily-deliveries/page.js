'use client';
import { useState, useEffect, useMemo } from 'react';
import { showToast } from '../components/Toast';
import { IconClipboard, IconCheck, IconSquare, IconCheckSquare, IconLoader, IconBarChart } from '../components/Icons';

export default function DailyDeliveriesPage() {
    const [deliveries, setDeliveries] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingRowKey, setSavingRowKey] = useState(null);

    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const todayStr = new Date().toISOString().split('T')[0];
    const [filterAgent, setFilterAgent] = useState('');

    // Local state for quantities edited by user before or after checking
    const [localQtyMap, setLocalQtyMap] = useState({});
    const [addedProductsMap, setAddedProductsMap] = useState({}); // customer_id -> [{ product_id, qty }]
    const [pendingVerificationMap, setPendingVerificationMap] = useState({});

    const fetchData = async () => {
        try {
            const [custRes, prodRes, agentRes] = await Promise.all([
                fetch('/api/customers?limit=500'),
                fetch('/api/products'),
                fetch('/api/agents')
            ]);
            const custData = await custRes.json();
            setCustomers(Array.isArray(custData) ? custData : (custData?.customers || []));
            const prodData = await prodRes.json();
            setProducts(Array.isArray(prodData) ? prodData : []);
            const agentData = await agentRes.json();
            setAgents(Array.isArray(agentData) ? agentData : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchDeliveries = async () => {
        try {
            const url = `/api/daily-deliveries?date=${filterDate}`;
            const res = await fetch(url);
            const data = await res.json();
            setDeliveries(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    // fetch deliveries for specific date immediately
    const fetchDeliveriesFor = async (date) => {
        try {
            const url = `/api/daily-deliveries?date=${date}`;
            const res = await fetch(url);
            const data = await res.json();
            setDeliveries(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { if (!loading) fetchDeliveries(); }, [loading]);

    // Build list of attendance items per customer and product for the selected agent
    const attendanceData = useMemo(() => {
        const prodList = Array.isArray(products) ? products : [];
        const custList = Array.isArray(customers) ? customers : [];
        const deliveryList = Array.isArray(deliveries) ? deliveries : [];

        const productMap = {};
        prodList.forEach(p => { if (p && p.id) productMap[p.id] = p; });

        // Filter customers by their assigned agent
        const agentCustomers = filterAgent
            ? custList.filter(c => String(c?.agent_id || '') === String(filterAgent))
            : custList;

        const customerGroups = [];

        agentCustomers.forEach(cust => {
            if (!cust) return;
            let items = [];
            if (Array.isArray(cust.parsed_subscriptions) && cust.parsed_subscriptions.length > 0) {
                items = [...cust.parsed_subscriptions];
            } else if (cust.subscribed_product_id) {
                items = [{ product_id: cust.subscribed_product_id, quantity: cust.subscribed_quantity || 1.0 }];
            } else if (prodList.length > 0) {
                items = [{ product_id: prodList[0].id, quantity: 1.0 }];
            }

            // include any user-added products for this customer
            const added = (addedProductsMap && addedProductsMap[cust.id]) || [];
            if (added.length > 0) {
                items = items.concat(added.map(a => ({ product_id: a.product_id, quantity: a.qty })));
            }

            // ensure any deliveries present in DB for this customer but not in subscription/items are included
            const custDeliveries = deliveryList.filter(d => String(d?.customer_id) === String(cust.id));
            const itemProductIds = new Set(items.map(it => String(it?.product_id)));
            custDeliveries.forEach(d => {
                if (d && !itemProductIds.has(String(d.product_id))) {
                    items.push({ product_id: d.product_id, quantity: d.quantity });
                }
            });

            const rowItems = items.map(sub => {
                if (!sub) return null;
                const rowKey = `${cust.id}_${sub.product_id}`;
                const prod = productMap[sub.product_id] || {};

                // Check if delivery record exists in DB for date + customer + product
                const existingDoc = deliveryList.find(
                    d => String(d?.customer_id) === String(cust.id) && String(d?.product_id) === String(sub.product_id)
                );

                const currentQty = (localQtyMap && localQtyMap[rowKey] !== undefined)
                    ? localQtyMap[rowKey]
                    : (existingDoc ? parseFloat(existingDoc.quantity) : (parseFloat(sub.quantity) || 1.0));

                return {
                    rowKey,
                    customer_id: cust.id,
                    customer_name: cust.name,
                    product_id: sub.product_id,
                    product_name: prod.name || sub.product_name || 'Milk Product',
                    rate: prod.price || sub.price || 0,
                    subscribed_qty: sub.quantity || 1.0,
                    qty: currentQty,
                    is_verified: !!existingDoc && !pendingVerificationMap[rowKey],
                    db_id: existingDoc ? existingDoc.id : null,
                };
            }).filter(Boolean);

            customerGroups.push({
                customer_id: cust.id,
                customer_name: cust.name,
                address: cust.address,
                phone: cust.phone,
                rows: rowItems
            });
        });

        return customerGroups;
    }, [customers, products, deliveries, filterAgent, localQtyMap, addedProductsMap, pendingVerificationMap]);

    // All flat rows for summary calculation
    const flatRows = useMemo(() => {
        return attendanceData.flatMap(g => g.rows);
    }, [attendanceData]);

    // Product totals summary for footer
    const productSummary = useMemo(() => {
        const summary = {};
        flatRows.forEach(r => {
            const pName = r.product_name;
            if (!summary[pName]) {
                summary[pName] = { totalQty: 0, verifiedQty: 0, count: 0 };
            }
            summary[pName].totalQty += parseFloat(r.qty) || 0;
            summary[pName].count += 1;
            if (r.is_verified) {
                summary[pName].verifiedQty += parseFloat(r.qty) || 0;
            }
        });
        return summary;
    }, [flatRows]);

    const handleQtyChange = async (row, newQtyStr) => {
        const val = parseFloat(newQtyStr) || 0;
        setLocalQtyMap(prev => ({ ...prev, [row.rowKey]: val }));

        if (row.is_verified) {
            setPendingVerificationMap(prev => ({ ...prev, [row.rowKey]: true }));
        }
    };

    const addProductForCustomer = async (customerId, productId) => {
        if (!productId) return;
        const rowKey = `${customerId}_${productId}`;
        if (flatRows.some(row => row.rowKey === rowKey)) {
            showToast('Product is already in this register', 'error');
            return;
        }

        setAddedProductsMap(prev => ({
            ...prev,
            [customerId]: [...(prev[customerId] || []), { product_id: productId, qty: 1.0 }],
        }));
        setLocalQtyMap(prev => ({ ...prev, [rowKey]: 1.0 }));
        showToast('Product added. Set quantity, then verify.');
    };

    const toggleVerification = async (row) => {
        setSavingRowKey(row.rowKey);
        try {
            if (row.is_verified && row.db_id) {
                // Delete delivery record to unverify
                const response = await fetch(`/api/daily-deliveries/${row.db_id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to unverify delivery');
                showToast(`Unverified ${row.customer_name} - ${row.product_name}`);
            } else {
                // Save delivery record to DB
                const response = await fetch('/api/daily-deliveries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_id: row.customer_id,
                        product_id: row.product_id,
                        delivery_date: filterDate,
                        quantity: row.qty,
                        rate: row.rate
                    })
                });
                if (!response.ok) throw new Error('Failed to verify delivery');
                setPendingVerificationMap(prev => {
                    const next = { ...prev };
                    delete next[row.rowKey];
                    return next;
                });
                showToast(`Verified ${row.customer_name} (${row.qty} pkts)`);
            }
            await fetchDeliveries();
        } catch (e) {
            showToast('Error persisting verification to DB', 'error');
        }
        setSavingRowKey(null);
    };

    const handleVerifyAll = async () => {
        const unverifiedRows = flatRows.filter(r => !r.is_verified);
        if (unverifiedRows.length === 0) {
            showToast(filterAgent
                ? 'All customer deliveries for this agent are already verified!'
                : 'All customer deliveries are already verified!');
            return;
        }

        const payload = unverifiedRows.map(r => ({
            customer_id: r.customer_id,
            product_id: r.product_id,
            delivery_date: filterDate,
            quantity: r.qty,
            rate: r.rate
        }));

        try {
            const response = await fetch('/api/daily-deliveries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Failed to verify deliveries');
            setPendingVerificationMap(prev => {
                const next = { ...prev };
                unverifiedRows.forEach(row => delete next[row.rowKey]);
                return next;
            });
            showToast(`Verified & saved ${unverifiedRows.length} deliveries to DB!`);
            await fetchDeliveries();
        } catch (e) {
            showToast('Error bulk verifying deliveries', 'error');
        }
    };

    if (loading) return <div className="spinner" />;

    const verifiedCount = flatRows.filter(r => r.is_verified).length;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Daily Attendance Register</h2>
                    <p>Track daily product deliveries per customer with instant verification</p>
                </div>
                <div className="daily-register-header-actions" style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-primary" onClick={handleVerifyAll} disabled={flatRows.length === 0}>
                        ✓ Verify All Pending ({flatRows.length - verifiedCount})
                    </button>
                </div>
            </div>

            <div className="filters-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Date:</label>
                    <input className="form-control" type="date" value={filterDate} onChange={(e) => {
                        const newDate = e.target.value;
                        setFilterDate(newDate);
                        // clear local transient state so previous date values do not leak
                        setDeliveries([]);
                        setLocalQtyMap({});
                        setAddedProductsMap({});
                        setPendingVerificationMap({});
                        // fetch fresh data for selected date
                        fetchDeliveriesFor(newDate);
                    }} style={{ width: 160 }} max={todayStr} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Agent:</label>
                    <select className="form-control" value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">All Agents</option>
                        {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                    </select>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        Verified: <strong style={{ color: '#34d399' }}>{verifiedCount} / {flatRows.length}</strong>
                    </span>
                </div>
            </div>

            {/* Attendance Sheet Table matching screenshot format */}
            <div className="table-container daily-register-table-container" style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <table className="data-table daily-register-table">
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '2px solid var(--border)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', width: '35%' }}>Customer Name</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', width: '35%' }}>Product Name</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', width: '15%' }}>Quantity</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', width: '15%' }}>Verify Attendance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceData.length === 0 ? (
                            <tr className="daily-register-empty-row">
                                <td colSpan={4}>
                                    <div className="empty-state">
                                        <div className="icon"><IconClipboard size={40} /></div>
                                        <h3>{filterAgent ? 'No customers found for this agent' : 'No customers found'}</h3>
                                        <p>{filterAgent ? 'Select another agent or add customers to get started' : 'Add customers to get started'}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            attendanceData.map((group) => (
                                group.rows.map((row, index) => (
                                    <tr
                                        key={row.rowKey}
                                        style={{
                                            borderBottom: index === group.rows.length - 1 ? '2px solid var(--border)' : '1px solid rgba(255,255,255,0.05)',
                                            background: row.is_verified ? 'rgba(52,211,153,0.04)' : 'transparent',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        {/* Customer Name column - spans multiple rows if customer has multiple products */}
                                        {index === 0 && (
                                            <td
                                                className="daily-register-customer-cell"
                                                rowSpan={group.rows.length}
                                                style={{
                                                    padding: '12px 16px',
                                                    fontWeight: 700,
                                                    fontSize: '0.95rem',
                                                    verticalAlign: 'middle',
                                                    borderRight: '1px solid var(--border)',
                                                    color: 'var(--foreground)'
                                                }}
                                            >
                                                <div>{group.customer_name}</div>
                                                {group.address && (
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 400, marginTop: 2 }}>
                                                        {group.address}
                                                    </div>
                                                )}

                                                <div style={{ marginTop: 8 }}>
                                                    <select className="form-control" style={{ width: 220 }} onChange={(e) => addProductForCustomer(group.customer_id, e.target.value)} value="">
                                                        <option value="">+ Add product</option>
                                                        {products.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name} — ₹{parseFloat(p.price || 0).toFixed(2)}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                        )}

                                        {/* Product Name */}
                                        <td className="daily-register-product-cell" style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--foreground)', fontSize: '0.9rem' }}>
                                            <div className="daily-register-mobile-customer">
                                                <div>{group.customer_name}</div>
                                                {group.address && (
                                                    <div className="daily-register-mobile-address">{group.address}</div>
                                                )}
                                                {index === 0 && (
                                                    <select className="form-control" onChange={(e) => addProductForCustomer(group.customer_id, e.target.value)} value="">
                                                        <option value="">+ Add product</option>
                                                        {products.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name} — ₹{parseFloat(p.price || 0).toFixed(2)}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                            {row.product_name}
                                        </td>

                                        {/* Quantity input */}
                                        <td className="daily-register-quantity-cell" style={{ padding: '10px 16px', textAlign: 'center' }}>
                                            <span className="daily-register-mobile-label">Quantity</span>
                                            <input
                                                className="form-control"
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                style={{ width: 80, margin: '0 auto', textAlign: 'center', fontWeight: 700 }}
                                                value={row.qty}
                                                onChange={(e) => handleQtyChange(row, e.target.value)}
                                            />
                                        </td>

                                        {/* Attendance Verification Checkbox */}
                                        <td className="daily-register-verify-cell" style={{ padding: '10px 16px', textAlign: 'center' }}>
                                            <span className="daily-register-mobile-label">Verify</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleVerification(row)}
                                                disabled={savingRowKey === row.rowKey}
                                                style={{
                                                    background: row.is_verified ? 'rgba(52,211,153,0.2)' : 'var(--background)',
                                                    border: row.is_verified ? '1px solid #34d399' : '1px solid var(--border)',
                                                    color: row.is_verified ? '#34d399' : 'var(--muted)',
                                                    padding: '6px 14px',
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }}
                                            >
                                                {savingRowKey === row.rowKey ? (
                                                    <><IconLoader size={14} /> Saving...</>
                                                ) : row.is_verified ? (
                                                    <><IconCheckSquare size={14} /> Verified</>
                                                ) : (
                                                    <><IconSquare size={14} /> Verify</>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bottom Product Totals Summary Footer */}
            {Object.keys(productSummary).length > 0 && (
                <div style={{ marginTop: 24, padding: 18, background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconBarChart size={18} /> {filterAgent ? 'Agent Product Quantities Summary' : 'Product Quantities Summary'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                        {Object.entries(productSummary).map(([pName, info]) => (
                            <div
                                key={pName}
                                style={{
                                    background: 'var(--background)',
                                    padding: '12px 14px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4
                                }}
                            >
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>{pName}</span>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>
                                        {info.totalQty.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)' }}>total pkts</span>
                                    </span>
                                    <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600 }}>
                                        {info.verifiedQty.toFixed(1)} verified
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
