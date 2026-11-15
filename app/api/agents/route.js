import { getDatabases, DATABASE_ID, COLLECTIONS, Query, ID } from '@/lib/appwrite';
import { NextResponse } from 'next/server';
import { authorizeRole } from '@/lib/auth-session';

export async function GET() {
    const { response } = await authorizeRole('admin');
    if (response) return response;
    try {
        const db = getDatabases();

        const [agentsRes, agentRoutesRes, routesRes] = await Promise.all([
            db.listDocuments(DATABASE_ID, COLLECTIONS.DELIVERY_AGENTS, [Query.orderAsc('name'), Query.limit(100)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.AGENT_ROUTES, [Query.limit(500)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.ROUTES, [Query.limit(100)])
        ]);

        const routeMap = {};
        routesRes.documents.forEach(r => {
            routeMap[r.$id] = r.name;
        });

        const agentRoutesMap = {};
        agentRoutesRes.documents.forEach(ar => {
            if (!agentRoutesMap[ar.agent_id]) {
                agentRoutesMap[ar.agent_id] = [];
            }
            agentRoutesMap[ar.agent_id].push({
                route_id: ar.route_id,
                route_name: routeMap[ar.route_id] || ''
            });
        });

        const agents = agentsRes.documents.map(da => ({
            id: da.$id,
            ...da,
            assigned_routes: agentRoutesMap[da.$id] || []
        }));

        return NextResponse.json(agents);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const { response } = await authorizeRole('admin');
    if (response) return response;
    try {
        const { name, phone, email, route_ids } = await request.json();
        const db = getDatabases();
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (!normalizedEmail) {
            return NextResponse.json({ error: 'Agent Google email required' }, { status: 400 });
        }

        const matchingAgents = await db.listDocuments(DATABASE_ID, COLLECTIONS.DELIVERY_AGENTS, [
            Query.equal('email', normalizedEmail),
            Query.limit(1),
        ]);
        if (matchingAgents.documents.length > 0) {
            return NextResponse.json({ error: 'An agent already uses this Google email' }, { status: 409 });
        }

        const agentDoc = await db.createDocument(
            DATABASE_ID,
            COLLECTIONS.DELIVERY_AGENTS,
            ID.unique(),
            {
                name,
                phone: phone || '',
                email: normalizedEmail,
                is_active: true
            }
        );

        if (route_ids && Array.isArray(route_ids) && route_ids.length > 0) {
            for (const routeId of route_ids) {
                await db.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.AGENT_ROUTES,
                    ID.unique(),
                    {
                        agent_id: agentDoc.$id,
                        route_id: routeId
                    }
                );
            }
        }

        return NextResponse.json({ id: agentDoc.$id, ...agentDoc }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
