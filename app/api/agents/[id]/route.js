import { getDatabases, DATABASE_ID, COLLECTIONS, Query, ID } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const { name, phone, route_ids, is_active } = await request.json();
        const db = getDatabases();

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (is_active !== undefined) updateData.is_active = is_active;

        // update agent
        const agentDoc = await db.updateDocument(
            DATABASE_ID,
            COLLECTIONS.DELIVERY_AGENTS,
            id,
            updateData
        );

        // update agent routes: remove existing, then add new
        const existing = await db.listDocuments(DATABASE_ID, COLLECTIONS.AGENT_ROUTES, [Query.equal('agent_id', id), Query.limit(500)]);
        if (existing.documents && existing.documents.length > 0) {
            for (const doc of existing.documents) {
                try {
                    await db.deleteDocument(DATABASE_ID, COLLECTIONS.AGENT_ROUTES, doc.$id);
                } catch (e) {
                    // continue
                }
            }
        }

        if (route_ids && Array.isArray(route_ids) && route_ids.length > 0) {
            for (const routeId of route_ids) {
                await db.createDocument(DATABASE_ID, COLLECTIONS.AGENT_ROUTES, ID.unique(), {
                    agent_id: id,
                    route_id: routeId
                });
            }
        }

        return NextResponse.json({ id: agentDoc.$id, ...agentDoc });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const db = getDatabases();

        // delete agent routes first
        const existing = await db.listDocuments(DATABASE_ID, COLLECTIONS.AGENT_ROUTES, [Query.equal('agent_id', id), Query.limit(500)]);
        if (existing.documents && existing.documents.length > 0) {
            for (const doc of existing.documents) {
                try {
                    await db.deleteDocument(DATABASE_ID, COLLECTIONS.AGENT_ROUTES, doc.$id);
                } catch (e) { }
            }
        }

        await db.deleteDocument(DATABASE_ID, COLLECTIONS.DELIVERY_AGENTS, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
