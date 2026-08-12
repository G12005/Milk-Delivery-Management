import { getDatabases, DATABASE_ID, COLLECTIONS, Query } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = getDatabases();

        const [productsRes, companiesRes, purchasesRes, deliveriesRes] = await Promise.all([
            db.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.equal('is_active', true), Query.limit(500)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.COMPANIES, [Query.limit(100)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.PURCHASE_ENTRIES, [Query.limit(1000)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.DAILY_DELIVERIES, [Query.limit(1000)])
        ]);

        const companyMap = {};
        companiesRes.documents.forEach(co => companyMap[co.$id] = co.name);

        const purchasedMap = {};
        purchasesRes.documents.forEach(pe => {
            purchasedMap[pe.product_id] = (purchasedMap[pe.product_id] || 0) + parseFloat(pe.quantity);
        });

        const deliveredMap = {};
        deliveriesRes.documents.forEach(dd => {
            deliveredMap[dd.product_id] = (deliveredMap[dd.product_id] || 0) + parseFloat(dd.quantity);
        });

        const inventory = productsRes.documents.map(p => {
            const totalPurchased = purchasedMap[p.$id] || 0;
            const totalDelivered = deliveredMap[p.$id] || 0;
            return {
                product_id: p.$id,
                product_name: p.name,
                company_name: companyMap[p.company_id] || '',
                total_purchased: totalPurchased,
                total_delivered: totalDelivered,
                current_stock: totalPurchased - totalDelivered
            };
        });

        // Sort by company_name, product_name
        inventory.sort((a, b) => {
            const compCompare = a.company_name.localeCompare(b.company_name);
            if (compCompare !== 0) return compCompare;
            return a.product_name.localeCompare(b.product_name);
        });

        return NextResponse.json(inventory);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
