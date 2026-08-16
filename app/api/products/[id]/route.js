import { getDatabases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const { company_id, name, unit, price, is_active } = await request.json();
        const db = getDatabases();

        const updateData = {};
        if (company_id !== undefined) updateData.company_id = company_id;
        if (name !== undefined) updateData.name = name;
        if (unit !== undefined) updateData.unit = unit;
        if (price !== undefined) {
            const p = parseFloat(price);
            if (!Number.isFinite(p) || p < 0) {
                return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
            }
            updateData.price = p;
        }
        if (is_active !== undefined) updateData.is_active = is_active;

        const doc = await db.updateDocument(
            DATABASE_ID,
            COLLECTIONS.PRODUCTS,
            id,
            updateData
        );

        return NextResponse.json({ id: doc.$id, ...doc });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const db = getDatabases();
        await db.deleteDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
