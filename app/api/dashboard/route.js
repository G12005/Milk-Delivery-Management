import { getDatabases, DATABASE_ID, COLLECTIONS, Query } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = getDatabases();

        const todayStr = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const [customers, products, agents, routes, pendingBillsRes, todayDeliveries, recentPaymentsRes] =
            await Promise.all([
                db.listDocuments(DATABASE_ID, COLLECTIONS.CUSTOMERS, [Query.equal('is_active', true), Query.limit(1)]),
                db.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.equal('is_active', true), Query.limit(1)]),
                db.listDocuments(DATABASE_ID, COLLECTIONS.DELIVERY_AGENTS, [Query.equal('is_active', true), Query.limit(1)]),
                db.listDocuments(DATABASE_ID, COLLECTIONS.ROUTES, [Query.limit(1)]),
                db.listDocuments(DATABASE_ID, COLLECTIONS.BILLS, [Query.notEqual('status', 'paid'), Query.limit(500)]),
                db.listDocuments(DATABASE_ID, COLLECTIONS.DAILY_DELIVERIES, [Query.equal('delivery_date', todayStr), Query.limit(1)]),
                db.listDocuments(DATABASE_ID, COLLECTIONS.PAYMENTS, [Query.greaterThanEqual('payment_date', thirtyDaysAgoStr), Query.limit(500)])
            ]);

        const totalDue = pendingBillsRes.documents.reduce((sum, b) => {
            return sum + (parseFloat(b.total_amount) - parseFloat(b.paid_amount || 0));
        }, 0);

        const recentPaymentsTotal = recentPaymentsRes.documents.reduce((sum, p) => {
            return sum + parseFloat(p.amount);
        }, 0);

        return NextResponse.json({
            total_customers: customers.total,
            total_products: products.total,
            total_agents: agents.total,
            total_routes: routes.total,
            pending_bills: pendingBillsRes.total,
            total_due: totalDue,
            today_deliveries: todayDeliveries.total,
            payments_last_30_days: recentPaymentsTotal,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
