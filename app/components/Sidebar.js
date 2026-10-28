'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    IconDashboard, IconUsers, IconClipboard, IconMap, IconTruck,
    IconMilk, IconPackage, IconBarChart, IconFactory,
    IconReceipt, IconCreditCard, IconBank, IconMenu, IconX
} from './Icons';

const navSections = [
    {
        title: 'Overview',
        links: [
            { href: '/', label: 'Dashboard', icon: IconDashboard },
        ],
    },
    {
        title: 'Delivery',
        links: [
            { href: '/customers', label: 'Customers', icon: IconUsers },
            { href: '/daily-deliveries', label: 'Daily Register', icon: IconClipboard },
            { href: '/delivery-routes', label: 'Routes', icon: IconMap },
            { href: '/agents', label: 'Delivery Agents', icon: IconTruck },
        ],
    },
    {
        title: 'Products',
        links: [
            { href: '/products', label: 'Products', icon: IconMilk },
            { href: '/purchases', label: 'Purchases', icon: IconPackage },
            { href: '/inventory', label: 'Inventory', icon: IconBarChart },
            { href: '/wholesalers', label: 'Wholesalers', icon: IconFactory },
        ],
    },
    {
        title: 'Finance',
        links: [
            { href: '/bills', label: 'Bills', icon: IconReceipt },
            { href: '/payments', label: 'Payments', icon: IconCreditCard },
            { href: '/bank-accounts', label: 'Bank Accounts', icon: IconBank },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // Close on escape key
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                className="mobile-menu-btn"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
            >
                <IconMenu size={20} />
            </button>

            {/* Overlay for mobile */}
            <div
                className={`sidebar-overlay${open ? ' open' : ''}`}
                onClick={() => setOpen(false)}
            />

            <aside className={`sidebar${open ? ' open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <IconMilk size={18} />
                    </div>
                    <h1>Milk Delivery</h1>
                    {/* Mobile close button inside sidebar */}
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setOpen(false)}
                        aria-label="Close menu"
                        style={{
                            display: open ? 'flex' : undefined,
                            position: 'static',
                            marginLeft: 'auto',
                            boxShadow: 'none',
                            border: 'none',
                            background: 'transparent',
                        }}
                    >
                        <IconX size={18} />
                    </button>
                </div>
                <nav className="sidebar-nav">
                    {navSections.map((section) => (
                        <div key={section.title}>
                            <div className="sidebar-section-title">{section.title}</div>
                            {section.links.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`nav-link${pathname === link.href ? ' active' : ''}`}
                                    >
                                        <span className="icon"><Icon size={18} /></span>
                                        <span>{link.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>
            </aside>
        </>
    );
}
