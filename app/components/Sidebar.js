'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navSections = [
    {
        title: 'Overview',
        links: [
            { href: '/', label: 'Dashboard', icon: '📊' },
        ],
    },
    {
        title: 'Delivery',
        links: [
            { href: '/customers', label: 'Customers', icon: '👥' },
            { href: '/daily-deliveries', label: 'Daily Register', icon: '📋' },
            { href: '/delivery-routes', label: 'Routes', icon: '🗺️' },
            { href: '/agents', label: 'Delivery Agents', icon: '🚚' },
        ],
    },
    {
        title: 'Products',
        links: [
            { href: '/products', label: 'Products', icon: '🥛' },
            { href: '/purchases', label: 'Purchases', icon: '📦' },
            { href: '/inventory', label: 'Inventory', icon: '📈' },
            { href: '/wholesalers', label: 'Wholesalers', icon: '🏭' },
        ],
    },
    {
        title: 'Finance',
        links: [
            { href: '/bills', label: 'Bills', icon: '🧾' },
            { href: '/payments', label: 'Payments', icon: '💳' },
            { href: '/bank-accounts', label: 'Bank Accounts', icon: '🏦' },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">🥛</div>
                <h1>Milk Delivery</h1>
            </div>
            <nav className="sidebar-nav">
                {navSections.map((section) => (
                    <div key={section.title}>
                        <div className="sidebar-section-title">{section.title}</div>
                        {section.links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`nav-link${pathname === link.href ? ' active' : ''}`}
                            >
                                <span className="icon">{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        ))}
                    </div>
                ))}
            </nav>
        </aside>
    );
}
