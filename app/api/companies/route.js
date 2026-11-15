import { getDatabases, DATABASE_ID, COLLECTIONS, Query, ID } from '@/lib/appwrite';
import { NextResponse } from 'next/server';
import { authorizeRole } from '@/lib/auth-session';

export async function GET() {
    const { response } = await authorizeRole('admin');
    if (response) return response;
    try {
        const db = getDatabases();
        const response = await db.listDocuments(
            DATABASE_ID,
            COLLECTIONS.COMPANIES,
            [Query.orderAsc('name'), Query.limit(100)]
        );
        const docs = response.documents.map(doc => ({
            id: doc.$id,
            ...doc
        }));
        return NextResponse.json(docs);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const { response } = await authorizeRole('admin');
    if (response) return response;
    try {
        const { name } = await request.json();
        const db = getDatabases();
        const doc = await db.createDocument(
            DATABASE_ID,
            COLLECTIONS.COMPANIES,
            ID.unique(),
            { name, is_active: true }
        );
        return NextResponse.json({ id: doc.$id, ...doc }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
