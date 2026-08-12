import { getDatabases, DATABASE_ID, COLLECTIONS, Query, ID } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('company_id');
        const db = getDatabases();

        // Fetch companies to map company_name
        const companiesRes = await db.listDocuments(DATABASE_ID, COLLECTIONS.COMPANIES, [Query.limit(100)]);
        const companyMap = {};
        companiesRes.documents.forEach(c => {
            companyMap[c.$id] = c.name;
        });

        const queries = [Query.limit(100)];
        if (companyId) {
            queries.push(Query.equal('company_id', companyId));
        }

        const productsRes = await db.listDocuments(DATABASE_ID, COLLECTIONS.PRODUCTS, queries);
        const products = productsRes.documents.map(p => ({
            id: p.$id,
            ...p,
            company_name: companyMap[p.company_id] || ''
        }));

        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { company_id, name, unit, price } = await request.json();
        const db = getDatabases();

        const doc = await db.createDocument(
            DATABASE_ID,
            COLLECTIONS.PRODUCTS,
            ID.unique(),
            {
                company_id,
                name,
                unit: unit || 'packet',
                price: parseFloat(price),
                is_active: true
            }
        );

        return NextResponse.json({ id: doc.$id, ...doc }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
