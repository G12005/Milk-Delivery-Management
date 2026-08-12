/**
 * Setup script to programmatically create Appwrite Database, Collections, and Attributes.
 * Run this script using: node scripts/setup-appwrite.js
 */

const { Client, Databases } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

// Manually load .env.local variables if present
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...vals] = trimmed.split('=');
            const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
            if (key && val && !process.env[key.trim()]) {
                process.env[key.trim()] = val;
            }
        }
    });
}

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const dbId = process.env.APPWRITE_DATABASE_ID || 'milk_delivery';

if (!projectId || projectId === 'your_project_id_here' || !apiKey || apiKey === 'your_server_api_key_here') {
    console.error('\n❌ ERROR: Appwrite credentials missing!');
    console.error('Please open .env.local and set:');
    console.error('  NEXT_PUBLIC_APPWRITE_PROJECT_ID=<your-project-id>');
    console.error('  APPWRITE_API_KEY=<your-api-key>\n');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

const databases = new Databases(client);

const schema = [
    {
        id: 'companies',
        name: 'Companies',
        attributes: [
            { key: 'name', type: 'string', size: 100, required: true },
            { key: 'is_active', type: 'boolean', required: false, default: true }
        ]
    },
    {
        id: 'products',
        name: 'Products',
        attributes: [
            { key: 'company_id', type: 'string', size: 36, required: true },
            { key: 'name', type: 'string', size: 150, required: true },
            { key: 'unit', type: 'string', size: 30, required: false, default: 'packet' },
            { key: 'price', type: 'float', required: true },
            { key: 'is_active', type: 'boolean', required: false, default: true }
        ]
    },
    {
        id: 'routes',
        name: 'Routes',
        attributes: [
            { key: 'name', type: 'string', size: 100, required: true },
            { key: 'area', type: 'string', size: 200, required: false, default: '' }
        ]
    },
    {
        id: 'delivery_agents',
        name: 'Delivery Agents',
        attributes: [
            { key: 'name', type: 'string', size: 100, required: true },
            { key: 'phone', type: 'string', size: 15, required: false, default: '' },
            { key: 'is_active', type: 'boolean', required: false, default: true }
        ]
    },
    {
        id: 'agent_routes',
        name: 'Agent Routes',
        attributes: [
            { key: 'agent_id', type: 'string', size: 36, required: true },
            { key: 'route_id', type: 'string', size: 36, required: true }
        ]
    },
    {
        id: 'customers',
        name: 'Customers',
        attributes: [
            { key: 'name', type: 'string', size: 150, required: true },
            { key: 'phone', type: 'string', size: 15, required: false, default: '' },
            { key: 'address', type: 'string', size: 500, required: false, default: '' },
            { key: 'route_id', type: 'string', size: 36, required: false, default: null },
            { key: 'agent_id', type: 'string', size: 36, required: false, default: null },
            { key: 'billing_cycle', type: 'enum', elements: ['1-to-last', '11-to-10', 'daily'], required: false, default: '1-to-last' },
            { key: 'payment_type', type: 'enum', elements: ['prepaid', 'postpaid'], required: false, default: 'postpaid' },
            { key: 'subscriptions', type: 'string', size: 2000, required: false, default: '[]' },
            { key: 'subscribed_quantity', type: 'float', required: false, default: 1.0 },
            { key: 'subscribed_product_id', type: 'string', size: 36, required: false, default: null },
            { key: 'is_active', type: 'boolean', required: false, default: true }
        ]
    },
    {
        id: 'daily_deliveries',
        name: 'Daily Deliveries',
        attributes: [
            { key: 'customer_id', type: 'string', size: 36, required: true },
            { key: 'product_id', type: 'string', size: 36, required: true },
            { key: 'delivery_date', type: 'string', size: 10, required: true },
            { key: 'quantity', type: 'float', required: true },
            { key: 'rate', type: 'float', required: true }
        ]
    },
    {
        id: 'bills',
        name: 'Bills',
        attributes: [
            { key: 'customer_id', type: 'string', size: 36, required: true },
            { key: 'period_start', type: 'string', size: 10, required: true },
            { key: 'period_end', type: 'string', size: 10, required: true },
            { key: 'total_amount', type: 'float', required: true },
            { key: 'paid_amount', type: 'float', required: false, default: 0 },
            { key: 'status', type: 'enum', elements: ['pending', 'partial', 'paid'], required: false, default: 'pending' }
        ]
    },
    {
        id: 'bill_items',
        name: 'Bill Items',
        attributes: [
            { key: 'bill_id', type: 'string', size: 36, required: true },
            { key: 'product_id', type: 'string', size: 36, required: true },
            { key: 'total_qty', type: 'float', required: true },
            { key: 'rate', type: 'float', required: true },
            { key: 'amount', type: 'float', required: true }
        ]
    },
    {
        id: 'bank_accounts',
        name: 'Bank Accounts',
        attributes: [
            { key: 'bank_name', type: 'string', size: 100, required: true },
            { key: 'account_number', type: 'string', size: 30, required: false, default: '' },
            { key: 'ifsc', type: 'string', size: 20, required: false, default: '' },
            { key: 'is_active', type: 'boolean', required: false, default: true }
        ]
    },
    {
        id: 'payments',
        name: 'Payments',
        attributes: [
            { key: 'bill_id', type: 'string', size: 36, required: false, default: null },
            { key: 'customer_id', type: 'string', size: 36, required: true },
            { key: 'amount', type: 'float', required: true },
            { key: 'mode', type: 'enum', elements: ['cash', 'upi', 'bank_transfer', 'cheque'], required: false, default: 'cash' },
            { key: 'bank_account_id', type: 'string', size: 36, required: false, default: null },
            { key: 'payment_date', type: 'string', size: 10, required: true },
            { key: 'notes', type: 'string', size: 500, required: false, default: '' }
        ]
    },
    {
        id: 'wholesalers',
        name: 'Wholesalers',
        attributes: [
            { key: 'name', type: 'string', size: 150, required: true },
            { key: 'phone', type: 'string', size: 15, required: false, default: '' },
            { key: 'address', type: 'string', size: 500, required: false, default: '' }
        ]
    },
    {
        id: 'purchase_entries',
        name: 'Purchase Entries',
        attributes: [
            { key: 'wholesaler_id', type: 'string', size: 36, required: true },
            { key: 'product_id', type: 'string', size: 36, required: true },
            { key: 'purchase_date', type: 'string', size: 10, required: true },
            { key: 'quantity', type: 'float', required: true },
            { key: 'cost_price', type: 'float', required: true }
        ]
    }
];

async function createAttribute(colId, attr) {
    try {
        const defaultValue = attr.required ? undefined : attr.default;
        if (attr.type === 'string') {
            await databases.createStringAttribute(dbId, colId, attr.key, attr.size, attr.required, defaultValue);
        } else if (attr.type === 'boolean') {
            await databases.createBooleanAttribute(dbId, colId, attr.key, attr.required, defaultValue);
        } else if (attr.type === 'float') {
            await databases.createFloatAttribute(dbId, colId, attr.key, attr.required, undefined, undefined, defaultValue);
        } else if (attr.type === 'enum') {
            await databases.createEnumAttribute(dbId, colId, attr.key, attr.elements, attr.required, defaultValue);
        }
        console.log(`   + Attribute "${attr.key}" created.`);
    } catch (e) {
        if (e.code === 409) {
            console.log(`   ✓ Attribute "${attr.key}" already exists.`);
        } else {
            console.log(`   ! Note for "${attr.key}": ${e.message}`);
        }
    }
}

async function setup() {
    console.log('🚀 Starting Appwrite Database Setup...');

    try {
        await databases.get(dbId);
        console.log(`✓ Database "${dbId}" exists.`);
    } catch {
        console.log(`Creating database "${dbId}"...`);
        await databases.create(dbId, 'Milk Delivery Management');
        console.log(`✓ Database created.`);
    }

    for (const col of schema) {
        try {
            await databases.getCollection(dbId, col.id);
            console.log(`✓ Collection "${col.name}" (${col.id}) exists.`);
        } catch {
            console.log(`Creating collection "${col.name}"...`);
            await databases.createCollection(dbId, col.id, col.name);
            console.log(`✓ Created collection "${col.name}".`);
        }

        console.log(`Checking attributes for "${col.name}"...`);
        for (const attr of col.attributes) {
            await createAttribute(col.id, attr);
        }
    }

    console.log('\n🎉 Appwrite database schema setup completed successfully!');
}

setup().catch(err => {
    console.error('Setup failed:', err);
});
