'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconBarChart, IconSquare, IconCheckSquare, IconLoader } from '../components/Icons';

async function fetchAssignedDeliveries() {
    const response = await fetch('/api/agent-deliveries');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load assigned deliveries');
    return {
        date: data.date,
        customers: Array.isArray(data.customers) ? data.customers : [],
        products: Array.isArray(data.products) ? data.products : [],
    };
}

function formatDeliveryDate(date) {
    if (!date) return '';
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function getInitialQuantities(customers) {
    return Object.fromEntries(
        customers.flatMap(customer => customer.items.map(item => {
            const quantity = Number(item.quantity);
            return [
                `${customer.id}_${item.product_id}`,
                String(Number.isFinite(quantity) && quantity >= 0 ? quantity : 0),
            ];
        }))
    );
}

function isEmptyQuantity(quantity) {
    return quantity == null || (typeof quantity === 'string' && quantity.trim() === '');
}

export default function AgentDeliveriesPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [deliveryDate, setDeliveryDate] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [productFilter, setProductFilter] = useState('');
    const [quantities, setQuantities] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState('');
    const [verifyingAll, setVerifyingAll] = useState(false);
    const [pendingVerification, setPendingVerification] = useState({});
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const loadDeliveries = async () => {
        try {
            const { date, customers: assignedCustomers, products: availableProducts } = await fetchAssignedDeliveries();
            setDeliveryDate(date);
            setCustomers(assignedCustomers);
            setProducts(availableProducts);
            setQuantities(getInitialQuantities(assignedCustomers));
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = useMemo(() => {
        const search = customerSearch.trim().toLocaleLowerCase();
        if (!search) return customers;
        return customers.filter(customer => (
            `${customer.name || ''} ${customer.address || ''}`.toLocaleLowerCase().includes(search)
        ));
    }, [customers, customerSearch]);

    const productSummary = useMemo(() => {
        const summary = {};
        filteredCustomers.forEach(customer => {
            customer.items
                .filter(item => !productFilter || String(item.product_id) === productFilter)
                .forEach(item => {
                const productName = item.product_name;
                if (!summary[productName]) {
                    summary[productName] = { totalQty: 0, verifiedQty: 0, count: 0 };
                }

                const key = `${customer.id}_${item.product_id}`;
                const parsedQuantity = Number.parseFloat(quantities[key] ?? item.quantity);
                const quantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 0;
                summary[productName].totalQty += quantity;
                summary[productName].count += 1;
                if (item.delivered && !pendingVerification[key]) {
                    summary[productName].verifiedQty += quantity;
                }
            });
        });
        return summary;
    }, [filteredCustomers, productFilter, quantities, pendingVerification]);

    const visibleItems = useMemo(() => filteredCustomers.flatMap(customer =>
        customer.items
            .filter(item => !productFilter || String(item.product_id) === productFilter)
            .map(item => ({
                customer,
                item,
                key: `${customer.id}_${item.product_id}`,
                isVerified: item.delivered && !pendingVerification[`${customer.id}_${item.product_id}`],
            }))
    ), [filteredCustomers, productFilter, pendingVerification]);

    const pendingItems = visibleItems.filter(row => !row.isVerified);

    useEffect(() => {
        let isActive = true;
        fetchAssignedDeliveries()
            .then(({ date, customers: assignedCustomers, products: availableProducts }) => {
                if (!isActive) return;
                setDeliveryDate(date);
                setCustomers(assignedCustomers);
                setProducts(availableProducts);
                setQuantities(getInitialQuantities(assignedCustomers));
            })
            .catch(loadError => {
                if (isActive) setError(loadError.message);
            })
            .finally(() => {
                if (isActive) setLoading(false);
            });
        return () => {
            isActive = false;
        };
    }, []);

    const restoreEmptyQuantity = key => {
        setQuantities(previous => isEmptyQuantity(previous[key])
            ? { ...previous, [key]: '0' }
            : previous);
    };

    const addProductForCustomer = (customerId, productId) => {
        if (!productId) return;
        const product = products.find(item => String(item.id) === String(productId));
        if (!product) return;

        const customer = customers.find(item => item.id === customerId);
        if (!customer || customer.items.some(item => String(item.product_id) === String(productId))) return;

        const newItem = {
            product_id: product.id,
            product_name: product.name,
            unit: product.unit || 'packet',
            quantity: 1,
            delivered: false,
            delivery_id: null,
            submitted_at: null,
        };
        setCustomers(previous => previous.map(item => item.id === customerId
            ? { ...item, items: [...item.items, newItem] }
            : item));
        setQuantities(previous => ({
            ...previous,
            [`${customerId}_${product.id}`]: '1',
        }));
    };

    const verifyDelivery = async (customerId, item, key) => {
        setSavingKey(key);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/agent-deliveries', {
                method: item.delivered && !pendingVerification[key] ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.delivered && !pendingVerification[key]
                    ? { delivery_id: item.delivery_id }
                    : {
                        items: [{
                            customer_id: customerId,
                            product_id: item.product_id,
                            quantity: isEmptyQuantity(quantities[key]) ? 0 : quantities[key],
                        }],
                    }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not verify delivery');
            setPendingVerification(previous => {
                const next = { ...previous };
                delete next[key];
                return next;
            });
            setMessage(item.delivered && !pendingVerification[key]
                ? 'Delivery unverified.'
                : 'Delivery verified.');
            await loadDeliveries();
        } catch (verifyError) {
            setError(verifyError.message);
        } finally {
            setSavingKey('');
        }
    };

    const handleVerifyAll = async () => {
        if (pendingItems.length === 0) return;
        setVerifyingAll(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/agent-deliveries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: pendingItems.map(({ customer, item, key }) => ({
                        customer_id: customer.id,
                        product_id: item.product_id,
                        quantity: isEmptyQuantity(quantities[key]) ? 0 : quantities[key],
                    })),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not verify deliveries');
            setPendingVerification({});
            setMessage(`Verified ${data.saved} deliveries.`);
            await loadDeliveries();
        } catch (verifyError) {
            setError(verifyError.message);
        } finally {
            setVerifyingAll(false);
        }
    };

    const signOut = async () => {
        try {
            const response = await fetch('/api/auth/session', { method: 'DELETE' });
            if (!response.ok) throw new Error('Unable to sign out. Please try again.');
            router.replace('/login');
            router.refresh();
        } catch (signOutError) {
            setError(signOutError.message);
        }
    };

    if (loading) return <div className="spinner" />;

    return (
        <div className="agent-shell">
            <header className="agent-header">
                <div>
                    <h1>Today’s deliveries</h1>
                    <p className="agent-date">Date: {formatDeliveryDate(deliveryDate)}</p>
                    <p>Only customers assigned to your account appear here.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleVerifyAll}
                        disabled={pendingItems.length === 0 || verifyingAll}
                    >
                        {verifyingAll ? 'Verifying…' : `✓ Verify All Pending (${pendingItems.length})`}
                    </button>
                    <button className="btn btn-secondary" onClick={signOut}>Sign out</button>
                </div>
            </header>

            <div className="agent-delivery-filters">
                <label className="agent-delivery-filter">
                    Search customers
                    <input
                        className="form-control"
                        type="search"
                        placeholder="Search by name or address"
                        value={customerSearch}
                        onChange={event => setCustomerSearch(event.target.value)}
                    />
                </label>
                <label className="agent-delivery-filter">
                    Filter by product
                    <select
                        className="form-control"
                        value={productFilter}
                        onChange={event => setProductFilter(event.target.value)}
                    >
                        <option value="">All products</option>
                        {products.map(product => (
                            <option key={product.id} value={String(product.id)}>{product.name}</option>
                        ))}
                    </select>
                </label>
                {(customerSearch || productFilter) && (
                    <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => {
                            setCustomerSearch('');
                            setProductFilter('');
                        }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="agent-success" role="status">{message}</p>}

            {customers.length === 0 ? (
                <section className="auth-card">
                    <h2>No assigned customers</h2>
                    <p>Ask your administrator to assign customers to your account.</p>
                </section>
            ) : filteredCustomers.length === 0 ? (
                <section className="auth-card">
                    <h2>No matching customers</h2>
                    <p>Try another search.</p>
                </section>
            ) : filteredCustomers.map(customer => {
                const visibleItems = customer.items.filter(item => (
                    !productFilter || String(item.product_id) === productFilter
                ));
                const selectedProduct = products.find(product => String(product.id) === productFilter);
                return (
                <section className="agent-customer" key={customer.id}>
                    <h2>{customer.name}</h2>
                    {customer.address && <p>{customer.address}</p>}
                    {customer.items.length === 0 && !productFilter && <p>No products in today’s register.</p>}
                    {productFilter && visibleItems.length === 0 &&
                        <p>No {selectedProduct?.name || 'matching product'} in today’s register.</p>}
                    {visibleItems.map(item => {
                        const key = `${customer.id}_${item.product_id}`;
                        const isVerified = item.delivered && !pendingVerification[key];
                        return (
                            <div className="agent-delivery-row" key={key}>
                                <span>{item.product_name}</span>
                                <label>
                                    <span>Quantity ({item.unit})</span>
                                    <input
                                        className="form-control"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={quantities[key] ?? ''}
                                        disabled={savingKey === key || verifyingAll}
                                        onChange={event => {
                                            setQuantities(previous => ({
                                                ...previous,
                                                [key]: event.target.value,
                                            }));
                                            if (item.delivered) {
                                                setPendingVerification(previous => ({ ...previous, [key]: true }));
                                            }
                                        }}
                                        onBlur={() => restoreEmptyQuantity(key)}
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={() => verifyDelivery(customer.id, item, key)}
                                    disabled={savingKey === key || verifyingAll}
                                    style={{
                                        background: isVerified ? 'rgba(52,211,153,0.2)' : 'var(--background)',
                                        border: isVerified ? '1px solid #34d399' : '1px solid var(--border)',
                                        color: isVerified ? '#34d399' : 'var(--muted)',
                                        padding: '6px 14px',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {savingKey === key ? (
                                        <><IconLoader size={14} /> Saving…</>
                                    ) : isVerified ? (
                                        <><IconCheckSquare size={14} /> Verified</>
                                    ) : (
                                        <><IconSquare size={14} /> Verify</>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                    <label className="agent-add-product">
                        <span>Add product to today’s register</span>
                        <select
                            className="form-control"
                            value=""
                            onChange={event => addProductForCustomer(customer.id, event.target.value)}
                        >
                            <option value="">+ Add product</option>
                            {products
                                .filter(product => (
                                    (!productFilter || String(product.id) === productFilter)
                                    && !customer.items.some(item => String(item.product_id) === String(product.id))
                                ))
                                .map(product => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} — ₹{Number(product.price || 0).toFixed(2)}
                                    </option>
                                ))}
                        </select>
                    </label>
                </section>
                );
            })}

            {Object.keys(productSummary).length > 0 && (
                <div style={{ marginTop: 24, padding: 18, background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconBarChart size={18} /> Agent Product Quantities Summary
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                        {Object.entries(productSummary).map(([productName, info]) => (
                            <div
                                key={productName}
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
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>{productName}</span>
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
