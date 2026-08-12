import { Client, Databases, Query, ID } from 'node-appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
const apiKey = process.env.APPWRITE_API_KEY || '';

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'milk_delivery';

export const COLLECTIONS = {
    COMPANIES: 'companies',
    PRODUCTS: 'products',
    ROUTES: 'routes',
    DELIVERY_AGENTS: 'delivery_agents',
    AGENT_ROUTES: 'agent_routes',
    CUSTOMERS: 'customers',
    DAILY_DELIVERIES: 'daily_deliveries',
    BILLS: 'bills',
    BILL_ITEMS: 'bill_items',
    BANK_ACCOUNTS: 'bank_accounts',
    PAYMENTS: 'payments',
    WHOLESALERS: 'wholesalers',
    PURCHASE_ENTRIES: 'purchase_entries',
};

export function getDatabases() {
    const client = new Client();
    client
        .setEndpoint(endpoint)
        .setProject(projectId);

    if (apiKey) {
        client.setKey(apiKey);
    }

    return new Databases(client);
}

export { Query, ID };
