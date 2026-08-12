/**
 * Seeding script to populate Appwrite Database with dummy/sample data.
 * Run using: node scripts/seed-appwrite.js
 */

const { Client, Databases, ID } = require('node-appwrite');
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

const db = new Databases(client);

async function seed() {
    console.log('🌱 Starting Appwrite Seed Script...\n');

    // 1. Companies
    console.log('Inserting Companies...');
    const companiesData = ['Amul', 'Sanchi', 'MotherDairy'];
    const companyDocs = {};
    for (const name of companiesData) {
        const doc = await db.createDocument(dbId, 'companies', ID.unique(), { name, is_active: true });
        companyDocs[name] = doc.$id;
    }
    console.log(`✓ Inserted ${companiesData.length} companies.`);

    // 2. Products
    console.log('Inserting Products...');
    const productsData = [
        { company: 'Amul', name: 'Amul Gold Milk 500ml', unit: 'packet', price: 32.00 },
        { company: 'Amul', name: 'Amul Taaza Milk 500ml', unit: 'packet', price: 25.00 },
        { company: 'Amul', name: 'Amul Gold Milk 1L', unit: 'packet', price: 62.00 },
        { company: 'Sanchi', name: 'Sanchi Full Cream Milk 500ml', unit: 'packet', price: 30.00 },
        { company: 'Sanchi', name: 'Sanchi Toned Milk 500ml', unit: 'packet', price: 24.00 },
        { company: 'MotherDairy', name: 'MotherDairy Full Cream 500ml', unit: 'packet', price: 31.00 },
        { company: 'MotherDairy', name: 'MotherDairy Dahi 400g', unit: 'packet', price: 35.00 },
    ];
    const productDocs = [];
    for (const item of productsData) {
        const doc = await db.createDocument(dbId, 'products', ID.unique(), {
            company_id: companyDocs[item.company],
            name: item.name,
            unit: item.unit,
            price: item.price,
            is_active: true
        });
        productDocs.push(doc);
    }
    console.log(`✓ Inserted ${productDocs.length} products.`);

    // 3. Routes
    console.log('Inserting Routes...');
    const routesData = [
        { name: 'Route A', area: 'Sector 1-5, Main Market' },
        { name: 'Route B', area: 'Sector 6-10, Old City' },
        { name: 'Route C', area: 'Sector 11-15, New Colony' },
        { name: 'Route D', area: 'Sector 16-20, Industrial Area' }
    ];
    const routeDocs = [];
    for (const r of routesData) {
        const doc = await db.createDocument(dbId, 'routes', ID.unique(), r);
        routeDocs.push(doc);
    }
    console.log(`✓ Inserted ${routeDocs.length} routes.`);

    // 4. Delivery Agents
    console.log('Inserting Delivery Agents...');
    const agentsData = [
        { name: 'Ramesh Kumar', phone: '9876543210' },
        { name: 'Suresh Yadav', phone: '9876543211' },
        { name: 'Manoj Singh', phone: '9876543212' }
    ];
    const agentDocs = [];
    for (const a of agentsData) {
        const doc = await db.createDocument(dbId, 'delivery_agents', ID.unique(), { ...a, is_active: true });
        agentDocs.push(doc);
    }
    console.log(`✓ Inserted ${agentDocs.length} delivery agents.`);

    // 5. Agent-Route Assignments
    console.log('Assigning Agents to Routes...');
    await db.createDocument(dbId, 'agent_routes', ID.unique(), { agent_id: agentDocs[0].$id, route_id: routeDocs[0].$id });
    await db.createDocument(dbId, 'agent_routes', ID.unique(), { agent_id: agentDocs[0].$id, route_id: routeDocs[1].$id });
    await db.createDocument(dbId, 'agent_routes', ID.unique(), { agent_id: agentDocs[1].$id, route_id: routeDocs[2].$id });
    await db.createDocument(dbId, 'agent_routes', ID.unique(), { agent_id: agentDocs[2].$id, route_id: routeDocs[3].$id });
    console.log(`✓ Assigned routes.`);

    // 6. Bank Accounts
    console.log('Inserting Bank Accounts...');
    const bankData = [
        { bank_name: 'State Bank of India', account_number: '1234567890', ifsc: 'SBIN0001234' },
        { bank_name: 'HDFC Bank', account_number: '9876543210', ifsc: 'HDFC0005678' },
    ];
    const bankDocs = [];
    for (const b of bankData) {
        const doc = await db.createDocument(dbId, 'bank_accounts', ID.unique(), { ...b, is_active: true });
        bankDocs.push(doc);
    }
    console.log(`✓ Inserted ${bankDocs.length} bank accounts.`);

    // 7. Customers
    console.log('Inserting Customers...');
    const customersData = [
        { name: 'Rajesh Sharma', phone: '9001234567', address: '12, Sector 2, Main Road', route_id: routeDocs[0].$id, agent_id: agentDocs[0].$id, billing_cycle: '1-to-last', payment_type: 'postpaid' },
        { name: 'Priya Patel', phone: '9001234568', address: '45, Sector 3, Lane 4', route_id: routeDocs[0].$id, agent_id: agentDocs[0].$id, billing_cycle: '1-to-last', payment_type: 'postpaid' },
        { name: 'Amit Gupta', phone: '9001234569', address: '78, Sector 7, Block B', route_id: routeDocs[1].$id, agent_id: agentDocs[0].$id, billing_cycle: '11-to-10', payment_type: 'postpaid' },
        { name: 'Sunita Verma', phone: '9001234570', address: '23, Sector 8, Market Road', route_id: routeDocs[1].$id, agent_id: agentDocs[1].$id, billing_cycle: '11-to-10', payment_type: 'prepaid' },
        { name: 'Vikram Joshi', phone: '9001234571', address: '56, Sector 12, Colony', route_id: routeDocs[2].$id, agent_id: agentDocs[1].$id, billing_cycle: '1-to-last', payment_type: 'postpaid' },
    ];
    const customerDocs = [];
    for (const c of customersData) {
        const doc = await db.createDocument(dbId, 'customers', ID.unique(), { ...c, is_active: true });
        customerDocs.push(doc);
    }
    console.log(`✓ Inserted ${customerDocs.length} customers.`);

    // 8. Wholesalers
    console.log('Inserting Wholesalers...');
    const wholesalersData = [
        { name: 'Sharma Distributors', phone: '9112233440', address: '15, Wholesale Market, Ring Road' },
        { name: 'Gupta Dairy Supplies', phone: '9112233441', address: '22, Dairy Complex, Station Road' },
    ];
    const wholesalerDocs = [];
    for (const w of wholesalersData) {
        const doc = await db.createDocument(dbId, 'wholesalers', ID.unique(), w);
        wholesalerDocs.push(doc);
    }
    console.log(`✓ Inserted ${wholesalerDocs.length} wholesalers.`);

    // 9. Purchase Entries
    console.log('Inserting Purchase Entries (Stock)...');
    const todayStr = new Date().toISOString().split('T')[0];
    for (let i = 0; i < 3; i++) {
        await db.createDocument(dbId, 'purchase_entries', ID.unique(), {
            wholesaler_id: wholesalerDocs[0].$id,
            product_id: productDocs[i].$id,
            purchase_date: todayStr,
            quantity: 100,
            cost_price: productDocs[i].price - 3
        });
    }
    console.log(`✓ Inserted purchase entries.`);

    // 10. Daily Deliveries
    console.log('Inserting Daily Deliveries...');
    for (const cust of customerDocs) {
        await db.createDocument(dbId, 'daily_deliveries', ID.unique(), {
            customer_id: cust.$id,
            product_id: productDocs[0].$id,
            delivery_date: todayStr,
            quantity: 2,
            rate: productDocs[0].price
        });
    }
    console.log(`✓ Inserted daily deliveries for today.`);

    // 11. Bills & Bill Items
    console.log('Inserting Sample Bills...');
    const billDoc = await db.createDocument(dbId, 'bills', ID.unique(), {
        customer_id: customerDocs[0].$id,
        period_start: '2026-07-01',
        period_end: '2026-07-31',
        total_amount: 1920.00,
        paid_amount: 1000.00,
        status: 'partial'
    });

    await db.createDocument(dbId, 'bill_items', ID.unique(), {
        bill_id: billDoc.$id,
        product_id: productDocs[0].$id,
        total_qty: 60,
        rate: 32.00,
        amount: 1920.00
    });

    // 12. Payments
    console.log('Inserting Sample Payment...');
    await db.createDocument(dbId, 'payments', ID.unique(), {
        bill_id: billDoc.$id,
        customer_id: customerDocs[0].$id,
        amount: 1000.00,
        mode: 'upi',
        bank_account_id: bankDocs[0].$id,
        payment_date: todayStr,
        notes: 'Advance payment via GPay'
    });
    console.log(`✓ Inserted sample bill and payment.`);

    console.log('\n🎉 Appwrite Dummy Data Seeded Successfully!');
}

seed().catch(err => {
    console.error('Seeding failed:', err);
});
