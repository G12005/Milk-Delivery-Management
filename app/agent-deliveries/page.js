'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

async function fetchAssignedDeliveries() {
    const response = await fetch('/api/agent-deliveries');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load assigned deliveries');
    return {
        customers: Array.isArray(data.customers) ? data.customers : [],
        products: Array.isArray(data.products) ? data.products : [],
    };
}

function getInitialQuantities(customers) {
    return Object.fromEntries(
        customers.flatMap(customer => customer.items.map(item => [
            `${customer.id}_${item.product_id}`,
            String(item.quantity),
        ]))
    );
}

export default function AgentDeliveriesPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingKey, setSavingKey] = useState('');
    const [now, setNow] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const loadDeliveries = async () => {
        try {
            const { customers: assignedCustomers, products: availableProducts } = await fetchAssignedDeliveries();
            setCustomers(assignedCustomers);
            setProducts(availableProducts);
            setQuantities(getInitialQuantities(assignedCustomers));
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isActive = true;
        fetchAssignedDeliveries()
            .then(({ customers: assignedCustomers, products: availableProducts }) => {
                if (!isActive) return;
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

    useEffect(() => {
        const updateNow = () => setNow(Date.now());
        updateNow();
        const timer = setInterval(updateNow, 30_000);
        return () => clearInterval(timer);
    }, []);

    const pendingItems = useMemo(() => customers.flatMap(customer =>
        customer.items
            .filter(item => !item.delivered)
            .map(item => ({
                customer_id: customer.id,
                product_id: item.product_id,
                quantity: quantities[`${customer.id}_${item.product_id}`],
            }))
    ), [customers, quantities]);

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
            editable_until: null,
        };
        setCustomers(previous => previous.map(item => item.id === customerId
            ? { ...item, items: [...item.items, newItem] }
            : item));
        setQuantities(previous => ({
            ...previous,
            [`${customerId}_${product.id}`]: '1',
        }));
    };

    const submitDeliveries = async () => {
        setSubmitting(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/agent-deliveries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: pendingItems }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not submit deliveries');
            setMessage(`Submitted ${data.saved} deliveries.`);
            await loadDeliveries();
        } catch (submitError) {
            setError(submitError.message);
        } finally {
            setSubmitting(false);
        }
    };

    const saveQuantity = async (item, key) => {
        setSavingKey(key);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/agent-deliveries', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    delivery_id: item.delivery_id,
                    quantity: quantities[key],
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not update delivery quantity');

            setCustomers(previous => previous.map(customer => ({
                ...customer,
                items: customer.items.map(delivery => delivery.delivery_id === data.delivery_id
                    ? { ...delivery, quantity: data.quantity, editable_until: data.editable_until }
                    : delivery),
            })));
            setQuantities(previous => ({ ...previous, [key]: String(data.quantity) }));
            setMessage('Quantity updated.');
        } catch (updateError) {
            setError(updateError.message);
        } finally {
            setSavingKey('');
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
                    <p>Only customers assigned to your account appear here.</p>
                </div>
                <button className="btn btn-secondary" onClick={signOut}>Sign out</button>
            </header>

            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="agent-success" role="status">{message}</p>}

            {customers.length === 0 ? (
                <section className="auth-card">
                    <h2>No assigned customers</h2>
                    <p>Ask your administrator to assign customers to your account.</p>
                </section>
            ) : customers.map(customer => (
                <section className="agent-customer" key={customer.id}>
                    <h2>{customer.name}</h2>
                    {customer.address && <p>{customer.address}</p>}
                    {customer.items.length === 0 && <p>No products in today’s register.</p>}
                    {customer.items.map(item => {
                        const key = `${customer.id}_${item.product_id}`;
                        const editableUntil = Date.parse(item.editable_until);
                        const quantity = Number(quantities[key]);
                        const canSaveQuantity = Number.isFinite(quantity)
                            && quantity > 0
                            && quantity !== Number(item.quantity);
                        return (
                            <div className="agent-delivery-row" key={key}>
                                <span>{item.product_name}</span>
                                {item.delivered ? (
                                    <div className="agent-delivery-edit">
                                        <label>
                                            <span>Submitted quantity ({item.unit})</span>
                                            <input
                                                className="form-control"
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={quantities[key] ?? ''}
                                                disabled={!item.editable_until || now === null || editableUntil <= now || savingKey === key}
                                                onChange={event => setQuantities(previous => ({
                                                    ...previous,
                                                    [key]: event.target.value,
                                                }))}
                                            />
                                        </label>
                                        {item.editable_until && now !== null && editableUntil > now &&
                                            <>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => saveQuantity(item, key)}
                                                    disabled={savingKey === key || !canSaveQuantity}
                                                >
                                                    {savingKey === key ? 'Saving…' : 'Save quantity'}
                                                </button>
                                            </>
                                        }
                                    </div>
                                ) : (
                                    <label>
                                        <span>Quantity ({item.unit})</span>
                                        <input
                                            className="form-control"
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={quantities[key] ?? ''}
                                            onChange={event => setQuantities(previous => ({
                                                ...previous,
                                                [key]: event.target.value,
                                            }))}
                                        />
                                    </label>
                                )}
                            </div>
                        );
                    })}
                    <label className="agent-add-product">
                        <span>Add product to today’s register</span>
                        <select
                            className="form-control"
                            value=""
                            disabled={submitting}
                            onChange={event => addProductForCustomer(customer.id, event.target.value)}
                        >
                            <option value="">+ Add product</option>
                            {products
                                .filter(product => !customer.items.some(item => String(item.product_id) === String(product.id)))
                                .map(product => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} — ₹{Number(product.price || 0).toFixed(2)}
                                    </option>
                                ))}
                        </select>
                    </label>
                </section>
            ))}

            <button
                className="btn btn-primary agent-submit"
                onClick={submitDeliveries}
                disabled={submitting || pendingItems.length === 0}
            >
                {submitting ? 'Submitting…' : `Submit pending deliveries (${pendingItems.length})`}
            </button>
        </div>
    );
}
