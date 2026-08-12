import { getDatabases, DATABASE_ID, COLLECTIONS, Query, ID } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const wholesalerId = searchParams.get('wholesaler_id');
        const db = getDatabases();

        const queries = [Query.orderDesc('purchase_date'), Query.limit(100)];
        if (date) queries.push(Query.equal('purchase_date', date));
        if (wholesalerId) queries.push(Query.equal('wholesaler_id', wholesalerId));

        const [purchasesRes, wholesalersRes, productsRes, companiesRes] = await Promise.all([
            db.listDocuments(DATABASE_ID, COLLECTIONS.PURCHASE_ENTRIES, queries),
            db.listDocuments(DATABASE_ID, COLLECTIONS.WHOLESALERS, [Query.limit(100)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.limit(500)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.COMPANIES, [Query.limit(100)])
        ]);

        const wholesalerMap = {};
        wholesalersRes.documents.forEach(w => wholesalerMap[w.$id] = w.name);

        const companyMap = {};
        companiesRes.documents.forEach(co => companyMap[co.$id] = co.name);

        const productMap = {};
        productsRes.documents.forEach(p => {
            productMap[p.$id] = {
                ...p,
                company_name: companyMap[p.company_id] || ''
            };
        });

        const purchases = purchasesRes.documents.map(pe => {
            const prod = productMap[pe.product_id] || {};
            return {
                id: pe.$id,
                ...pe,
                wholesaler_name: wholesalerMap[pe.wholesaler_id] || '',
                product_name: prod.name || '',
                unit: prod.unit || 'packet',
                company_name: prod.company_name || ''
            };
        });

        return NextResponse.json(purchases);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { wholesaler_id, product_id, purchase_date, quantity, cost_price } = await request.json();
        const db = getDatabases();

        const doc = await db.createDocument(
            DATABASE_ID,
            COLLECTIONS.PURCHASE_ENTRIES,
            ID.unique(),
            {
                wholesaler_id,
                product_id,
                purchase_date: purchase_date || new Date().toISOString().split('T')[0],
                quantity: parseFloat(quantity),
                cost_price: parseFloat(cost_price)
            }
        );

        return NextResponse.json({ id: doc.$id, ...doc }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
