import { getDatabases, DATABASE_ID, COLLECTIONS, Query, ID } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const routeId = searchParams.get('route_id');
        const agentId = searchParams.get('agent_id');
        const db = getDatabases();

        const [routesRes, agentsRes, productsRes] = await Promise.all([
            db.listDocuments(DATABASE_ID, COLLECTIONS.ROUTES, [Query.limit(100)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.DELIVERY_AGENTS, [Query.limit(100)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.limit(500)])
        ]);

        const routeMap = {};
        routesRes.documents.forEach(r => routeMap[r.$id] = r.name);

        const agentMap = {};
        agentsRes.documents.forEach(a => agentMap[a.$id] = a.name);

        const productMap = {};
        productsRes.documents.forEach(p => productMap[p.$id] = p);

        const hasPaging = searchParams.has('page') || (searchParams.has('limit') && searchParams.get('all') !== 'true');
        const page = Number(searchParams.get('page') || '1');
        const limit = Number(searchParams.get('limit') || (hasPaging ? '20' : '500'));
        const safePage = Number.isFinite(page) && page > 0 ? page : 1;
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : (hasPaging ? 20 : 500);
        const offset = hasPaging ? (safePage - 1) * safeLimit : 0;

        const queries = [
            Query.orderAsc('route_id'),
            Query.orderAsc('display_order'),
            Query.orderAsc('name'),
            Query.orderAsc('$createdAt'),
            Query.orderAsc('$id')
        ];
        if (routeId) queries.push(Query.equal('route_id', routeId));
        if (agentId) queries.push(Query.equal('agent_id', agentId));
        queries.push(Query.limit(safeLimit), Query.offset(offset));

        const customersRes = await db.listDocuments(DATABASE_ID, COLLECTIONS.CUSTOMERS, queries);

        const totalCustomers = customersRes.total ?? customersRes.documents.length;

        const customers = customersRes.documents.map(c => {
            let parsedSubs = [];
            if (c.subscriptions) {
                try {
                    const raw = typeof c.subscriptions === 'string' ? JSON.parse(c.subscriptions) : c.subscriptions;
                    if (Array.isArray(raw)) parsedSubs = raw;
                } catch (e) { console.error('Error parsing subscriptions:', e); }
            }
            if (parsedSubs.length === 0 && c.subscribed_product_id) {
                parsedSubs = [{ product_id: c.subscribed_product_id, quantity: c.subscribed_quantity || 1 }];
            }
            parsedSubs = parsedSubs.map(sub => {
                const prod = productMap[sub.product_id] || {};
                return {
                    ...sub,
                    product_name: prod.name || '',
                    price: prod.price || 0,
                    unit: prod.unit || 'packet'
                };
            });

            return {
                id: c.$id,
                ...c,
                display_order: c.display_order ?? 0,
                parsed_subscriptions: parsedSubs,
                route_name: routeMap[c.route_id] || '',
                agent_name: agentMap[c.agent_id] || ''
            };
        });

        if (hasPaging) {
            return NextResponse.json({
                customers,
                total: totalCustomers,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.max(1, Math.ceil(totalCustomers / safeLimit))
            });
        }

        return NextResponse.json(customers);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { name, phone, address, route_id, agent_id, billing_cycle, payment_type, subscriptions, subscribed_product_id, subscribed_quantity } = await request.json();
        const db = getDatabases();

        const subsString = subscriptions ? (typeof subscriptions === 'string' ? subscriptions : JSON.stringify(subscriptions)) : '[]';

        let displayOrder = 1000;
        if (route_id) {
            const routeCustomers = await db.listDocuments(DATABASE_ID, COLLECTIONS.CUSTOMERS, [
                Query.equal('route_id', route_id),
                Query.orderDesc('display_order'),
                Query.limit(1)
            ]);
            if (routeCustomers.documents.length > 0) {
                const lastOrder = Number(routeCustomers.documents[0].display_order || 0);
                displayOrder = Number.isFinite(lastOrder) ? lastOrder + 100 : 1000;
            }
        }

        const doc = await db.createDocument(
            DATABASE_ID,
            COLLECTIONS.CUSTOMERS,
            ID.unique(),
            {
                name,
                phone: phone || '',
                address: address || '',
                route_id: route_id || null,
                agent_id: agent_id || null,
                billing_cycle: billing_cycle || '1-to-last',
                payment_type: payment_type || 'postpaid',
                subscriptions: subsString,
                subscribed_product_id: subscribed_product_id || null,
                subscribed_quantity: subscribed_quantity ? parseFloat(subscribed_quantity) : 1.0,
                display_order: displayOrder,
                is_active: true
            }
        );

        return NextResponse.json({ id: doc.$id, ...doc }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
