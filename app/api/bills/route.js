import { getDatabases, DATABASE_ID, COLLECTIONS, Query, ID } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customer_id');
        const status = searchParams.get('status');
        const db = getDatabases();

        const queries = [Query.orderDesc('$createdAt'), Query.limit(100)];
        if (customerId) queries.push(Query.equal('customer_id', customerId));
        if (status) queries.push(Query.equal('status', status));

        const [billsRes, customersRes] = await Promise.all([
            db.listDocuments(DATABASE_ID, COLLECTIONS.BILLS, queries),
            db.listDocuments(DATABASE_ID, COLLECTIONS.CUSTOMERS, [Query.limit(500)])
        ]);

        const customerMap = {};
        customersRes.documents.forEach(c => customerMap[c.$id] = c);

        const bills = billsRes.documents.map(b => {
            const cust = customerMap[b.customer_id] || {};
            return {
                id: b.$id,
                ...b,
                customer_name: cust.name || '',
                billing_cycle: cust.billing_cycle || '',
                payment_type: cust.payment_type || ''
            };
        });

        return NextResponse.json(bills);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { customer_id, period_start, period_end } = await request.json();
        const db = getDatabases();

        // 1. Get deliveries in period for customer
        const deliveriesRes = await db.listDocuments(DATABASE_ID, COLLECTIONS.DAILY_DELIVERIES, [
            Query.equal('customer_id', customer_id),
            Query.greaterThanEqual('delivery_date', period_start),
            Query.lessThanEqual('delivery_date', period_end),
            Query.limit(1000)
        ]);

        if (deliveriesRes.documents.length === 0) {
            return NextResponse.json({ error: 'No deliveries found for this period' }, { status: 400 });
        }

        // Group by product_id and rate
        const groups = {};
        deliveriesRes.documents.forEach(d => {
            const rate = parseFloat(d.rate);
            const qty = parseFloat(d.quantity);
            const key = `${d.product_id}_${rate}`;
            if (!groups[key]) {
                groups[key] = {
                    product_id: d.product_id,
                    rate,
                    total_qty: 0,
                    amount: 0
                };
            }
            groups[key].total_qty += qty;
            groups[key].amount += qty * rate;
        });

        const itemsList = Object.values(groups);
        const totalAmount = itemsList.reduce((sum, item) => sum + item.amount, 0);

        // 2. Create Bill Document
        const billDoc = await db.createDocument(
            DATABASE_ID,
            COLLECTIONS.BILLS,
            ID.unique(),
            {
                customer_id,
                period_start,
                period_end,
                total_amount: totalAmount,
                paid_amount: 0,
                status: 'pending'
            }
        );

        // 3. Create Bill Items
        const createdItems = [];
        for (const item of itemsList) {
            const itemDoc = await db.createDocument(
                DATABASE_ID,
                COLLECTIONS.BILL_ITEMS,
                ID.unique(),
                {
                    bill_id: billDoc.$id,
                    product_id: item.product_id,
                    total_qty: item.total_qty,
                    rate: item.rate,
                    amount: item.amount
                }
            );
            createdItems.push({ id: itemDoc.$id, ...itemDoc });
        }

        // Fetch customer details & product details for enrichment
        const [customerDoc, productsRes] = await Promise.all([
            db.getDocument(DATABASE_ID, COLLECTIONS.CUSTOMERS, customer_id),
            db.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.limit(500)])
        ]);

        const prodMap = {};
        productsRes.documents.forEach(p => prodMap[p.$id] = p);

        const enrichedItems = createdItems.map(item => {
            const prod = prodMap[item.product_id] || {};
            return {
                ...item,
                product_name: prod.name || '',
                unit: prod.unit || 'packet'
            };
        });

        return NextResponse.json({
            id: billDoc.$id,
            ...billDoc,
            customer_name: customerDoc.name || '',
            billing_cycle: customerDoc.billing_cycle || '',
            payment_type: customerDoc.payment_type || '',
            customer_phone: customerDoc.phone || '',
            customer_address: customerDoc.address || '',
            items: enrichedItems
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
