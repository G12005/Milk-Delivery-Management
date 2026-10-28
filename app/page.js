'use client';
import { useState, useEffect } from 'react';
import {
  IconUsers, IconMilk, IconTruck, IconMap,
  IconClipboard, IconReceipt, IconWallet, IconCreditCard
} from './components/Icons';

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
    { label: 'Total Customers', value: stats?.total_customers || 0, Icon: IconUsers, bg: '#eff6ff', color: '#2563eb' },
    { label: 'Active Products', value: stats?.total_products || 0, Icon: IconMilk, bg: '#ecfdf5', color: '#059669' },
    { label: 'Delivery Agents', value: stats?.total_agents || 0, Icon: IconTruck, bg: '#fffbeb', color: '#d97706' },
    { label: 'Routes', value: stats?.total_routes || 0, Icon: IconMap, bg: '#f5f3ff', color: '#7c3aed' },
    { label: 'Today\'s Deliveries', value: stats?.today_deliveries || 0, Icon: IconClipboard, bg: '#eff6ff', color: '#2563eb' },
    { label: 'Pending Bills', value: stats?.pending_bills || 0, Icon: IconReceipt, bg: '#fef2f2', color: '#dc2626' },
    { label: 'Total Due', value: `₹${(stats?.total_due || 0).toLocaleString('en-IN')}`, Icon: IconWallet, bg: '#fffbeb', color: '#d97706' },
    { label: 'Payments (30d)', value: `₹${(stats?.payments_last_30_days || 0).toLocaleString('en-IN')}`, Icon: IconCreditCard, bg: '#ecfdf5', color: '#059669' },
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
            <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
              <card.Icon size={20} />
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
