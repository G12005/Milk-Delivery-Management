import { getDatabases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

async function handleUpdate(request, params) {
    try {
        const { id } = await params;
        const body = await request.json();
        const db = getDatabases();

        const updateData = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.phone !== undefined) updateData.phone = body.phone;
        if (body.address !== undefined) updateData.address = body.address;
        if (body.route_id !== undefined) updateData.route_id = body.route_id;
        if (body.agent_id !== undefined) updateData.agent_id = body.agent_id;
        if (body.billing_cycle !== undefined) updateData.billing_cycle = body.billing_cycle;
        if (body.payment_type !== undefined) updateData.payment_type = body.payment_type;
        if (body.display_order !== undefined) updateData.display_order = Number(body.display_order);
        if (body.subscriptions !== undefined) updateData.subscriptions = typeof body.subscriptions === 'string' ? body.subscriptions : JSON.stringify(body.subscriptions);
        if (body.subscribed_product_id !== undefined) updateData.subscribed_product_id = body.subscribed_product_id;
        if (body.subscribed_quantity !== undefined) updateData.subscribed_quantity = parseFloat(body.subscribed_quantity);
        if (body.is_active !== undefined) updateData.is_active = body.is_active;

        const doc = await db.updateDocument(
            DATABASE_ID,
            COLLECTIONS.CUSTOMERS,
            id,
            updateData
        );

        return NextResponse.json({ id: doc.$id, ...doc });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request, context) {
    return handleUpdate(request, context.params);
}

export async function PUT(request, context) {
    return handleUpdate(request, context.params);
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const db = getDatabases();
        await db.deleteDocument(DATABASE_ID, COLLECTIONS.CUSTOMERS, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
