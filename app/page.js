'use client';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const cards = [
    { label: 'Total Customers', value: stats?.total_customers || 0, icon: '👥', color: 'rgba(59,130,246,0.15)', border: '#3b82f6' },
    { label: 'Active Products', value: stats?.total_products || 0, icon: '🥛', color: 'rgba(16,185,129,0.15)', border: '#10b981' },
    { label: 'Delivery Agents', value: stats?.total_agents || 0, icon: '🚚', color: 'rgba(245,158,11,0.15)', border: '#f59e0b' },
    { label: 'Routes', value: stats?.total_routes || 0, icon: '🗺️', color: 'rgba(139,92,246,0.15)', border: '#8b5cf6' },
    { label: 'Today\'s Deliveries', value: stats?.today_deliveries || 0, icon: '📋', color: 'rgba(59,130,246,0.15)', border: '#3b82f6' },
    { label: 'Pending Bills', value: stats?.pending_bills || 0, icon: '🧾', color: 'rgba(239,68,68,0.15)', border: '#ef4444' },
    { label: 'Total Due', value: `₹${(stats?.total_due || 0).toLocaleString('en-IN')}`, icon: '💰', color: 'rgba(245,158,11,0.15)', border: '#f59e0b' },
    { label: 'Payments (30d)', value: `₹${(stats?.payments_last_30_days || 0).toLocaleString('en-IN')}`, icon: '💳', color: 'rgba(16,185,129,0.15)', border: '#10b981' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome to Milk Delivery Management System</p>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className="stat-icon" style={{ background: card.color, border: `1px solid ${card.border}30` }}>
              {card.icon}
            </div>
            <div className="stat-info">
              <h3>{card.value}</h3>
              <p>{card.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
