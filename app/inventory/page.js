'use client';
import { useState, useEffect } from 'react';

export default function InventoryPage() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/inventory')
            .then((r) => r.json())
            .then(setInventory)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="spinner" />;

    // Group by company
    const grouped = {};
    inventory.forEach((item) => {
        if (!grouped[item.company_name]) grouped[item.company_name] = [];
        grouped[item.company_name].push(item);
    });

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Inventory</h2>
                    <p>Current stock levels — Purchased minus Delivered</p>
                </div>
            </div>

            {Object.keys(grouped).length === 0 ? (
                <div className="empty-state"><div className="icon">📈</div><h3>No inventory data</h3><p>Start by adding purchases and deliveries</p></div>
            ) : Object.entries(grouped).map(([company, items]) => (
                <div key={company} style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge badge-info">{company}</span>
                    </h3>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                        {items.map((item) => {
                            const stock = parseFloat(item.current_stock);
                            const isLow = stock <= 0;
                            return (
                                <div className="glass-card" key={item.product_id} style={{ borderLeft: `3px solid ${isLow ? '#ef4444' : '#10b981'}` }}>
                                    <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 600 }}>{item.product_name}</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.82rem' }}>
                                        <div>
                                            <p style={{ color: 'var(--muted)', margin: '0 0 2px' }}>Purchased</p>
                                            <p style={{ margin: 0, fontWeight: 700, color: '#60a5fa' }}>{parseFloat(item.total_purchased).toFixed(1)}</p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--muted)', margin: '0 0 2px' }}>Delivered</p>
                                            <p style={{ margin: 0, fontWeight: 700, color: '#fbbf24' }}>{parseFloat(item.total_delivered).toFixed(1)}</p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--muted)', margin: '0 0 2px' }}>In Stock</p>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: isLow ? '#f87171' : '#34d399' }}>{stock.toFixed(1)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
