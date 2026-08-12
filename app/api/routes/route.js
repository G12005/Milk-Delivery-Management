import { getDatabases, DATABASE_ID, COLLECTIONS, Query, ID } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = getDatabases();
        const res = await db.listDocuments(DATABASE_ID, COLLECTIONS.ROUTES, [Query.orderAsc('name'), Query.limit(100)]);
        const docs = res.documents.map(doc => ({ id: doc.$id, ...doc }));
        return NextResponse.json(docs);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { name, area } = await request.json();
        const db = getDatabases();
        const doc = await db.createDocument(
            DATABASE_ID,
            COLLECTIONS.ROUTES,
            ID.unique(),
            { name, area: area || '' }
        );
        return NextResponse.json({ id: doc.$id, ...doc }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
