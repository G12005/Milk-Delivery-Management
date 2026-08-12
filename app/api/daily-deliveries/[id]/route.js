import { getDatabases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

async function handleUpdate(request, params) {
    try {
        const { id } = await params;
        const body = await request.json();
        const db = getDatabases();

        const updateData = {};
        if (body.customer_id !== undefined) updateData.customer_id = body.customer_id;
        if (body.product_id !== undefined) updateData.product_id = body.product_id;
        if (body.delivery_date !== undefined) updateData.delivery_date = body.delivery_date;
        if (body.quantity !== undefined) updateData.quantity = parseFloat(body.quantity);
        if (body.rate !== undefined) updateData.rate = parseFloat(body.rate);

        const doc = await db.updateDocument(
            DATABASE_ID,
            COLLECTIONS.DAILY_DELIVERIES,
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
        await db.deleteDocument(DATABASE_ID, COLLECTIONS.DAILY_DELIVERIES, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
