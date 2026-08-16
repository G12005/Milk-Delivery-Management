import { getDatabases, DATABASE_ID, COLLECTIONS, Query, ID } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const customerId = searchParams.get('customer_id');
        const routeId = searchParams.get('route_id');
        const db = getDatabases();

        const [customersRes, productsRes, companiesRes, routesRes] = await Promise.all([
            db.listDocuments(DATABASE_ID, COLLECTIONS.CUSTOMERS, [Query.limit(500)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.limit(500)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.COMPANIES, [Query.limit(100)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.ROUTES, [Query.limit(100)])
        ]);

        const customerMap = {};
        customersRes.documents.forEach(c => customerMap[c.$id] = c);

        const companyMap = {};
        companiesRes.documents.forEach(co => companyMap[co.$id] = co.name);

        const productMap = {};
        productsRes.documents.forEach(p => {
            productMap[p.$id] = {
                ...p,
                company_name: companyMap[p.company_id] || ''
            };
        });

        const routeMap = {};
        routesRes.documents.forEach(r => routeMap[r.$id] = r.name);

        const queries = [Query.orderDesc('delivery_date'), Query.limit(500)];
        if (date) queries.push(Query.equal('delivery_date', date));
        if (customerId) queries.push(Query.equal('customer_id', customerId));

        const deliveriesRes = await db.listDocuments(DATABASE_ID, COLLECTIONS.DAILY_DELIVERIES, queries);

        let deliveries = deliveriesRes.documents.map(dd => {
            const cust = customerMap[dd.customer_id] || {};
            const prod = productMap[dd.product_id] || {};
            return {
                id: dd.$id,
                ...dd,
                customer_name: cust.name || '',
                customer_address: cust.address || '',
                route_id: cust.route_id || null,
                route_name: routeMap[cust.route_id] || '',
                product_name: prod.name || '',
                unit: prod.unit || 'packet',
                company_name: prod.company_name || ''
            };
        });

        if (routeId) {
            deliveries = deliveries.filter(d => d.route_id === routeId);
        }

        return NextResponse.json(deliveries);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const db = getDatabases();
        const today = new Date().toISOString().split('T')[0];

        const createOrUpdateDelivery = async (item) => {
            const { id, customer_id, product_id, delivery_date, quantity, rate } = item;
            if (!delivery_date) throw new Error('delivery_date required');
            if (delivery_date > today) {
                const err = new Error('Delivery date cannot be in the future');
                err.status = 400;
                throw err;
            }
            
            // Check rate from product if not passed
            let finalRate = rate !== undefined ? parseFloat(rate) : 0;
            if (!finalRate && product_id) {
                try {
                    const prodDoc = await db.getDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, product_id);
                    finalRate = prodDoc.price || 0;
                } catch (e) { console.error('Rate lookup error:', e); }
            }

            if (id) {
                const doc = await db.updateDocument(
                    DATABASE_ID,
                    COLLECTIONS.DAILY_DELIVERIES,
                    id,
                    {
                        quantity: parseFloat(quantity),
                        rate: finalRate
                    }
                );
                return { id: doc.$id, ...doc };
            }

            // Check if document already exists for this date, customer, and product
            const existingRes = await db.listDocuments(
                DATABASE_ID,
                COLLECTIONS.DAILY_DELIVERIES,
                [
                    Query.equal('customer_id', customer_id),
                    Query.equal('product_id', product_id),
                    Query.equal('delivery_date', delivery_date),
                    Query.limit(1)
                ]
            );

            if (existingRes.documents.length > 0) {
                const existingId = existingRes.documents[0].$id;
                const doc = await db.updateDocument(
                    DATABASE_ID,
                    COLLECTIONS.DAILY_DELIVERIES,
                    existingId,
                    {
                        quantity: parseFloat(quantity),
                        rate: finalRate
                    }
                );
                return { id: doc.$id, ...doc };
            }

            const doc = await db.createDocument(
                DATABASE_ID,
                COLLECTIONS.DAILY_DELIVERIES,
                ID.unique(),
                {
                    customer_id,
                    product_id,
                    delivery_date,
                    quantity: parseFloat(quantity),
                    rate: finalRate
                }
            );
            return { id: doc.$id, ...doc };
        };

        if (Array.isArray(body)) {
            // validate dates first
            for (const item of body) {
                if (!item.delivery_date) return NextResponse.json({ error: 'delivery_date required' }, { status: 400 });
                if (item.delivery_date > today) return NextResponse.json({ error: 'Delivery date cannot be in the future' }, { status: 400 });
            }
            const results = await Promise.all(body.map(item => createOrUpdateDelivery(item)));
            return NextResponse.json(results, { status: 200 });
        }

        if (!body.delivery_date) return NextResponse.json({ error: 'delivery_date required' }, { status: 400 });
        if (body.delivery_date > today) return NextResponse.json({ error: 'Delivery date cannot be in the future' }, { status: 400 });
        const result = await createOrUpdateDelivery(body);
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
