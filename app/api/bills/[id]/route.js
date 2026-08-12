import { getDatabases, DATABASE_ID, COLLECTIONS, Query } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const db = getDatabases();

        let billDoc;
        try {
            billDoc = await db.getDocument(DATABASE_ID, COLLECTIONS.BILLS, id);
        } catch {
            return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
        }

        const [customerDoc, billItemsRes, paymentsRes, productsRes, companiesRes, bankAccsRes] = await Promise.all([
            db.getDocument(DATABASE_ID, COLLECTIONS.CUSTOMERS, billDoc.customer_id).catch(() => ({})),
            db.listDocuments(DATABASE_ID, COLLECTIONS.BILL_ITEMS, [Query.equal('bill_id', id), Query.limit(100)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.PAYMENTS, [Query.equal('bill_id', id), Query.limit(100)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.limit(500)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.COMPANIES, [Query.limit(100)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.BANK_ACCOUNTS, [Query.limit(100)])
        ]);

        const compMap = {};
        companiesRes.documents.forEach(co => compMap[co.$id] = co.name);

        const prodMap = {};
        productsRes.documents.forEach(p => {
            prodMap[p.$id] = {
                ...p,
                company_name: compMap[p.company_id] || ''
            };
        });

        const bankMap = {};
        bankAccsRes.documents.forEach(b => bankMap[b.$id] = b.bank_name);

        const items = billItemsRes.documents.map(bi => {
            const prod = prodMap[bi.product_id] || {};
            return {
                id: bi.$id,
                ...bi,
                product_name: prod.name || '',
                unit: prod.unit || 'packet',
                company_name: prod.company_name || ''
            };
        });

        const payments = paymentsRes.documents.map(py => ({
            id: py.$id,
            ...py,
            bank_name: bankMap[py.bank_account_id] || ''
        }));

        return NextResponse.json({
            id: billDoc.$id,
            ...billDoc,
            customer_name: customerDoc.name || '',
            billing_cycle: customerDoc.billing_cycle || '',
            payment_type: customerDoc.payment_type || '',
            customer_phone: customerDoc.phone || '',
            customer_address: customerDoc.address || '',
            items,
            payments
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const db = getDatabases();

        // Find and delete all bill items for this bill
        const itemsRes = await db.listDocuments(DATABASE_ID, COLLECTIONS.BILL_ITEMS, [Query.equal('bill_id', id), Query.limit(500)]);
        for (const item of itemsRes.documents) {
            await db.deleteDocument(DATABASE_ID, COLLECTIONS.BILL_ITEMS, item.$id);
        }

        // Delete bill document
        await db.deleteDocument(DATABASE_ID, COLLECTIONS.BILLS, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
