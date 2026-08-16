'use client';
import { useState, useEffect, useMemo } from 'react';
import { showToast } from '../components/Toast';

export default function DailyDeliveriesPage() {
    const [deliveries, setDeliveries] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingRowKey, setSavingRowKey] = useState(null);

    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const todayStr = new Date().toISOString().split('T')[0];
    const [filterRoute, setFilterRoute] = useState('');

    // Local state for quantities edited by user before or after checking
    const [localQtyMap, setLocalQtyMap] = useState({});
    const [addedProductsMap, setAddedProductsMap] = useState({}); // customer_id -> [{ product_id, qty }]

    const fetchData = async () => {
        try {
            const [custRes, prodRes, routeRes, agentRes] = await Promise.all([
                fetch('/api/customers'),
                fetch('/api/products'),
                fetch('/api/routes'),
                fetch('/api/agents')
            ]);
            setCustomers(await custRes.json());
            setProducts(await prodRes.json());
            setRoutes(await routeRes.json());
            setAgents(await agentRes.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchDeliveries = async () => {
        try {
            let url = `/api/daily-deliveries?date=${filterDate}`;
            if (filterRoute) url += `&route_id=${filterRoute}`;
            const res = await fetch(url);
            const data = await res.json();
            setDeliveries(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    // fetch deliveries for specific date immediately
    const fetchDeliveriesFor = async (date) => {
        try {
            let url = `/api/daily-deliveries?date=${date}`;
            if (filterRoute) url += `&route_id=${filterRoute}`;
            const res = await fetch(url);
            const data = await res.json();
            setDeliveries(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { if (!loading) fetchDeliveries(); }, [filterRoute, loading]);

    // Assigned agent for selected route
    const selectedRouteAgent = useMemo(() => {
        if (!filterRoute) return null;
        const assignedCustomers = customers.filter(c => String(c.route_id) === String(filterRoute));
        if (assignedCustomers.length > 0 && assignedCustomers[0].agent_name) {
            return assignedCustomers[0].agent_name;
        }
        for (const agent of agents) {
            if (agent.assigned_routes?.some(r => String(r.route_id) === String(filterRoute))) {
                return agent.name;
            }
        }
        return null;
    }, [filterRoute, customers, agents]);

    // Build list of attendance items per customer and product for the selected date & route
    const attendanceData = useMemo(() => {
        const productMap = {};
        products.forEach(p => productMap[p.id] = p);

        // Filter customers by selected route
        const routeCustomers = filterRoute
            ? customers.filter(c => String(c.route_id) === String(filterRoute))
            : customers;

        const customerGroups = [];

        routeCustomers.forEach(cust => {
            let items = [];
            if (cust.parsed_subscriptions && cust.parsed_subscriptions.length > 0) {
                items = cust.parsed_subscriptions;
            } else if (cust.subscribed_product_id) {
                items = [{ product_id: cust.subscribed_product_id, quantity: cust.subscribed_quantity || 1.0 }];
            } else if (products.length > 0) {
                items = [{ product_id: products[0].id, quantity: 1.0 }];
            }

            // include any user-added products for this customer
            const added = addedProductsMap[cust.id] || [];
            if (added.length > 0) {
                items = items.concat(added.map(a => ({ product_id: a.product_id, quantity: a.qty })));
            }

            // ensure any deliveries present in DB for this customer but not in subscription/items are included
            const custDeliveries = deliveries.filter(d => String(d.customer_id) === String(cust.id));
            const itemProductIds = new Set(items.map(it => String(it.product_id)));
            custDeliveries.forEach(d => {
                if (!itemProductIds.has(String(d.product_id))) {
                    items.push({ product_id: d.product_id, quantity: d.quantity });
                }
            });

            const rowItems = items.map(sub => {
                const rowKey = `${cust.id}_${sub.product_id}`;
                const prod = productMap[sub.product_id] || {};

                // Check if delivery record exists in DB for date + customer + product
                const existingDoc = deliveries.find(
                    d => String(d.customer_id) === String(cust.id) && String(d.product_id) === String(sub.product_id)
                );

                const currentQty = localQtyMap[rowKey] !== undefined
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
                    is_verified: !!existingDoc,
                    db_id: existingDoc ? existingDoc.id : null,
                };
            });

            customerGroups.push({
                customer_id: cust.id,
                customer_name: cust.name,
                address: cust.address,
                phone: cust.phone,
                rows: rowItems
            });
        });

        return customerGroups;
    }, [customers, products, deliveries, filterRoute, localQtyMap]);

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

        // If row is already saved/verified in DB, update it instantly via PATCH
        if (row.is_verified && row.db_id) {
            setSavingRowKey(row.rowKey);
            try {
                await fetch(`/api/daily-deliveries/${row.db_id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantity: val }),
                });
                fetchDeliveries();
            } catch (e) {
                showToast('Error updating quantity', 'error');
            }
            setSavingRowKey(null);
        }
    };

    const addProductForCustomer = async (customerId, productId) => {
        if (!productId) return;
        const rowKey = `${customerId}_${productId}`;
        const defaultQty = 1.0;
        setSavingRowKey(rowKey);
        try {
            // create delivery record immediately
            const payload = {
                customer_id: customerId,
                product_id: productId,
                delivery_date: filterDate,
                quantity: defaultQty
            };
            await fetch('/api/daily-deliveries', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // refresh deliveries from server so UI shows persisted record
            await fetchDeliveriesFor(filterDate);
            setLocalQtyMap(prev => ({ ...prev, [rowKey]: defaultQty }));
            showToast('Product added and saved');
        } catch (e) {
            showToast('Error saving added product', 'error');
        }
        setSavingRowKey(null);
    };

    const toggleVerification = async (row) => {
        setSavingRowKey(row.rowKey);
        try {
            if (row.is_verified && row.db_id) {
                // Delete delivery record to unverify
                await fetch(`/api/daily-deliveries/${row.db_id}`, { method: 'DELETE' });
                showToast(`Unverified ${row.customer_name} - ${row.product_name}`);
            } else {
                // Save delivery record to DB
                await fetch('/api/daily-deliveries', {
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
            showToast('All customer deliveries for this route are already verified!');
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
            await fetch('/api/daily-deliveries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            showToast(`Verified & saved ${unverifiedRows.length} deliveries to DB!`);
            fetchDeliveries();
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
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-primary" onClick={handleVerifyAll} disabled={flatRows.length === 0}>
                        ✅ Verify All Pending ({flatRows.length - verifiedCount})
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
                        // fetch fresh data for selected date
                        fetchDeliveriesFor(newDate);
                    }} style={{ width: 160 }} max={todayStr} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Route:</label>
                    <select className="form-control" value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">All Routes</option>
                        {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>

                {filterRoute && (
                    <div style={{ background: 'rgba(59,130,246,0.12)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🚚 <strong>Agent:</strong> {selectedRouteAgent || 'Unassigned'}</span>
                    </div>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        Verified: <strong style={{ color: '#34d399' }}>{verifiedCount} / {flatRows.length}</strong>
                    </span>
                </div>
            </div>

            {/* Attendance Sheet Table matching screenshot format */}
            <div className="table-container" style={{ background: 'var(--card-bg)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                            <tr>
                                <td colSpan={4}>
                                    <div className="empty-state">
                                        <div className="icon">📋</div>
                                        <h3>No customers found for this route</h3>
                                        <p>Select another route or add customers to get started</p>
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
                                        <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--foreground)', fontSize: '0.9rem' }}>
                                            {row.product_name}
                                        </td>

                                        {/* Quantity input */}
                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
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
                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
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
                                                    '⏳ Saving...'
                                                ) : row.is_verified ? (
                                                    '✅ Verified'
                                                ) : (
                                                    '⬜ Verify'
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
                        📊 Route Product Quantities Summary
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

