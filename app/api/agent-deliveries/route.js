import { NextResponse } from 'next/server';
import { authorizeRole } from '@/lib/auth-session';
import { COLLECTIONS, DATABASE_ID, getDatabases, ID, Query } from '@/lib/appwrite';

const EDIT_WINDOW_MS = 2 * 60 * 60 * 1000;

function parseSubscriptions(customer) {
    if (customer.subscriptions) {
        try {
            const parsed = typeof customer.subscriptions === 'string'
                ? JSON.parse(customer.subscriptions)
                : customer.subscriptions;
            if (Array.isArray(parsed)) return parsed;
        } catch (error) {
            console.error(`Invalid subscriptions for customer ${customer.$id}:`, error);
            throw new Error('Customer subscription data is invalid');
        }
    }
    if (customer.subscribed_product_id) {
        return [{
            product_id: customer.subscribed_product_id,
            quantity: customer.subscribed_quantity || 1,
        }];
    }
    return [];
}

export async function GET() {
    try {
        const { principal, response } = await authorizeRole('agent');
        if (response) return response;

        const db = getDatabases();
        const today = new Date().toISOString().slice(0, 10);
        const [customersRes, productsRes, deliveriesRes] = await Promise.all([
            db.listDocuments(DATABASE_ID, COLLECTIONS.CUSTOMERS, [
                Query.equal('agent_id', principal.agentId),
                Query.equal('is_active', true),
                Query.limit(500),
            ]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.limit(500)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.DAILY_DELIVERIES, [
                Query.equal('delivery_date', today),
                Query.limit(500),
            ]),
        ]);

        const customerIds = new Set(customersRes.documents.map(customer => customer.$id));
        const productMap = new Map(productsRes.documents.map(product => [product.$id, product]));
        const deliveryMap = new Map();
        const deliveriesByCustomer = new Map();
        deliveriesRes.documents
            .filter(delivery => customerIds.has(delivery.customer_id))
            .forEach(delivery => {
                deliveryMap.set(`${delivery.customer_id}_${delivery.product_id}`, delivery);
            });
        deliveryMap.forEach(delivery => {
            const customerDeliveries = deliveriesByCustomer.get(delivery.customer_id) || [];
            customerDeliveries.push(delivery);
            deliveriesByCustomer.set(delivery.customer_id, customerDeliveries);
        });

        const customers = customersRes.documents.map(customer => {
            const subscriptions = parseSubscriptions(customer);
            const subscriptionProductIds = new Set(subscriptions.map(subscription => String(subscription.product_id)));
            const subscribedItems = subscriptions.map(subscription => {
                const product = productMap.get(subscription.product_id);
                const existing = deliveryMap.get(`${customer.$id}_${subscription.product_id}`);
                return {
                    product_id: subscription.product_id,
                    product_name: product?.name || 'Product',
                    unit: product?.unit || 'packet',
                    quantity: existing ? Number(existing.quantity) : Number(subscription.quantity || 1),
                    delivered: Boolean(existing),
                    delivery_id: existing?.$id || null,
                    submitted_at: existing?.$createdAt || null,
                    editable_until: existing?.$createdAt
                        ? new Date(Date.parse(existing.$createdAt) + EDIT_WINDOW_MS).toISOString()
                        : null,
                };
            });
            const addedItems = (deliveriesByCustomer.get(customer.$id) || [])
                .filter(delivery => !subscriptionProductIds.has(String(delivery.product_id)))
                .map(delivery => {
                    const product = productMap.get(delivery.product_id);
                    return {
                        product_id: delivery.product_id,
                        product_name: product?.name || 'Product',
                        unit: product?.unit || 'packet',
                        quantity: Number(delivery.quantity),
                        delivered: true,
                        delivery_id: delivery.$id,
                        submitted_at: delivery.$createdAt,
                        editable_until: delivery.$createdAt
                            ? new Date(Date.parse(delivery.$createdAt) + EDIT_WINDOW_MS).toISOString()
                            : null,
                    };
                });

            return {
                id: customer.$id,
                name: customer.name,
                address: customer.address || '',
                items: [...subscribedItems, ...addedItems],
            };
        });

        const products = productsRes.documents.map(product => ({
            id: product.$id,
            name: product.name,
            unit: product.unit || 'packet',
            price: Number(product.price) || 0,
        }));

        return NextResponse.json({ date: today, customers, products });
    } catch (error) {
        console.error('Agent delivery list failed:', error);
        return NextResponse.json({ error: 'Unable to load assigned deliveries' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const { principal, response } = await authorizeRole('agent');
        if (response) return response;

        const body = await request.json();
        const deliveryId = body?.delivery_id;
        const rawQuantity = body?.quantity;
        const quantity = Number(rawQuantity);
        if (!deliveryId || !Number.isFinite(quantity) || quantity <= 0) {
            return NextResponse.json({ error: 'A valid delivery and quantity are required' }, { status: 400 });
        }

        const db = getDatabases();
        let delivery;
        try {
            delivery = await db.getDocument(DATABASE_ID, COLLECTIONS.DAILY_DELIVERIES, String(deliveryId));
        } catch (error) {
            if (error?.code === 404) {
                return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
            }
            throw error;
        }

        const today = new Date().toISOString().slice(0, 10);
        if (delivery.delivery_date !== today) {
            return NextResponse.json({ error: 'Only today’s deliveries can be edited' }, { status: 404 });
        }

        let customer;
        try {
            customer = await db.getDocument(DATABASE_ID, COLLECTIONS.CUSTOMERS, delivery.customer_id);
        } catch (error) {
            if (error?.code === 404) {
                return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
            }
            throw error;
        }

        if (customer.agent_id !== principal.agentId || customer.is_active === false) {
            return NextResponse.json({ error: 'This delivery is not assigned to you' }, { status: 403 });
        }

        const submittedAt = Date.parse(delivery.$createdAt);
        if (!Number.isFinite(submittedAt)) {
            throw new Error('Delivery submission timestamp is invalid');
        }
        const editableUntil = submittedAt + EDIT_WINDOW_MS;
        if (Date.now() >= editableUntil) {
            return NextResponse.json({ error: 'The 2-hour editing period has expired' }, { status: 409 });
        }

        const updated = await db.updateDocument(
            DATABASE_ID,
            COLLECTIONS.DAILY_DELIVERIES,
            delivery.$id,
            { quantity }
        );

        return NextResponse.json({
            delivery_id: updated.$id,
            quantity: Number(updated.quantity),
            submitted_at: updated.$createdAt,
            editable_until: new Date(editableUntil).toISOString(),
        });
    } catch (error) {
        console.error('Agent delivery update failed:', error);
        return NextResponse.json({ error: 'Unable to update delivery quantity' }, { status: 500 });
    }
}
export async function POST(request) {
    try {
        const { principal, response } = await authorizeRole('agent');
        if (response) return response;

        const { items } = await request.json();
        if (!Array.isArray(items) || items.length === 0 || items.length > 500) {
            return NextResponse.json({ error: 'Submit between 1 and 500 delivery rows' }, { status: 400 });
        }

        const today = new Date().toISOString().slice(0, 10);
        const keys = new Set();
        for (const item of items) {
            const customerId = String(item?.customer_id || '');
            const productId = String(item?.product_id || '');
            const quantity = Number(item?.quantity);
            const key = `${customerId}_${productId}`;
            if (!customerId || !productId || !Number.isFinite(quantity) || quantity <= 0 || keys.has(key)) {
                return NextResponse.json({ error: 'Delivery rows contain invalid or duplicate values' }, { status: 400 });
            }
            keys.add(key);
        }

        const db = getDatabases();
        const [customersRes, productsRes, deliveriesRes] = await Promise.all([
            db.listDocuments(DATABASE_ID, COLLECTIONS.CUSTOMERS, [
                Query.equal('agent_id', principal.agentId),
                Query.equal('is_active', true),
                Query.limit(500),
            ]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.limit(500)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.DAILY_DELIVERIES, [
                Query.equal('delivery_date', today),
                Query.limit(500),
            ]),
        ]);

        const customerMap = new Map(customersRes.documents.map(customer => [customer.$id, customer]));
        const productMap = new Map(productsRes.documents.map(product => [product.$id, product]));
        const existingKeys = new Set(deliveriesRes.documents.map(delivery => (
            `${delivery.customer_id}_${delivery.product_id}`
        )));

        const validated = [];
        for (const item of items) {
            const customer = customerMap.get(String(item.customer_id));
            const product = productMap.get(String(item.product_id));
            if (!customer || !product) {
                return NextResponse.json({ error: 'A customer or product is not assigned to this agent' }, { status: 403 });
            }
            if (existingKeys.has(`${customer.$id}_${product.$id}`)) {
                return NextResponse.json({ error: 'A submitted delivery cannot be edited or resubmitted' }, { status: 409 });
            }
            validated.push({
                customer_id: customer.$id,
                product_id: product.$id,
                delivery_date: today,
                quantity: Number(item.quantity),
                rate: Number(product.price) || 0,
            });
        }

        const results = await Promise.all(validated.map(delivery => db.createDocument(
            DATABASE_ID,
            COLLECTIONS.DAILY_DELIVERIES,
            ID.unique(),
            delivery
        )));

        return NextResponse.json({ saved: results.length }, { status: 201 });
    } catch (error) {
        console.error('Agent delivery submission failed:', error);
        return NextResponse.json({ error: 'Unable to save delivery submission' }, { status: 500 });
    }
}
