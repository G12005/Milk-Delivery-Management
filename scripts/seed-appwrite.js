/**
 * Import customers and their subscriptions from a CSV or TSV file into Appwrite.
 * Run with: node scripts/seed-appwrite.js [path-to-customer-file]
 * Set APPWRITE_CUSTOMERS_FILE to override the default Downloads file path.
 */

const { Client, Databases, ID, Query } = require('node-appwrite');
const fs = require('fs');
const os = require('os');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
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
const defaultTsvPath = path.join(os.homedir(), 'Downloads', 'DETAILS OF CUSTOMER WITH QTY - Sheet1.tsv');
const defaultCsvPath = path.join(os.homedir(), 'Downloads', 'DETAILS OF CUSTOMER WITH QTY - Sheet1.csv');
const customerFile = process.argv[2] || process.env.APPWRITE_CUSTOMERS_FILE ||
    (fs.existsSync(defaultTsvPath) ? defaultTsvPath : defaultCsvPath);

if (!projectId || projectId === 'your_project_id_here' || !apiKey || apiKey === 'your_server_api_key_here') {
    console.error('\nERROR: Appwrite credentials are missing or still use placeholders.');
    console.error('Set NEXT_PUBLIC_APPWRITE_PROJECT_ID and APPWRITE_API_KEY in .env.local.\n');
    process.exit(1);
}

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

const db = new Databases(client);

const products = [
    { column: 'GOLD', name: 'Gold', price: 35 },
    { column: 'Shakti', name: 'Shakti', price: 32 },
    { column: 'DTM', name: 'DTM', price: 26 },
    { column: 'DTM (160 ml)', name: 'DTM (160 ml)', price: 10 },
    { column: 'Cow', name: 'Cow', price: 31 },
    { column: 'Chai', name: 'Chai', price: 30 },
    { column: 'Taza', name: 'Taza', price: 29 },
    { column: 'A2', name: 'A2', price: 38 },
];

const expectedProductColumns = products.map(product => product.column);
const companyName = 'All_Milk';
const batchSize = 100;

function parseDelimited(text, delimiter) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (quoted) {
            if (char === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (char === '"') {
                quoted = false;
            } else {
                field += char;
            }
        } else if (char === '"' && field.length === 0) {
            quoted = true;
        } else if (char === delimiter) {
            row.push(field);
            field = '';
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && text[i + 1] === '\n') i++;
            row.push(field);
            if (row.some(value => value.trim())) rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }

    if (quoted) {
        throw new Error('Customer file contains an unterminated quoted field.');
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        if (row.some(value => value.trim())) rows.push(row);
    }

    return rows;
}

function readCustomers(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Customer file not found: ${filePath}`);
    }

    const delimiter = path.extname(filePath).toLowerCase() === '.csv' ? ',' : '\t';
    const rows = parseDelimited(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''), delimiter);
    const firstHeader = rows[0] || [];
    const productHeader = rows[1] || [];

    if (firstHeader[0]?.trim() !== 'Display Order' || firstHeader[1]?.trim() !== 'NAME OF CUSTOMER') {
        throw new Error('Customer file must start with Display Order and NAME OF CUSTOMER columns.');
    }

    expectedProductColumns.forEach((name, index) => {
        if (productHeader[index + 2]?.trim() !== name) {
            throw new Error(`Expected product column "${name}" at column ${index + 3}.`);
        }
    });

    const customers = [];
    const seenOrders = new Set();
    const seenNames = new Set();
    const agentNames = new Set();

    for (const [index, row] of rows.slice(2).entries()) {
        if (row.length !== 11) {
            throw new Error(`Row ${index + 3} has ${row.length} columns; expected 11.`);
        }

        const displayOrder = Number(row[0].trim());
        const name = row[1].trim().replace(/\s+/g, ' ');
        const agentName = row[10].trim().replace(/\s+/g, ' ').toUpperCase();

        if (!Number.isSafeInteger(displayOrder) || displayOrder < 1) {
            throw new Error(`Row ${index + 3} has an invalid display order.`);
        }
        if (!name) {
            throw new Error(`Row ${index + 3} has no customer name.`);
        }
        if (!agentName) {
            throw new Error(`Row ${index + 3} has no delivery person.`);
        }
        if (seenOrders.has(displayOrder)) {
            throw new Error(`Duplicate display order ${displayOrder}.`);
        }
        if (seenNames.has(name.toLocaleLowerCase())) {
            throw new Error(`Duplicate customer name "${name}".`);
        }

        seenOrders.add(displayOrder);
        seenNames.add(name.toLocaleLowerCase());
        agentNames.add(agentName);

        const subscriptions = [];
        products.forEach((product, productIndex) => {
            const rawQuantity = row[productIndex + 2].trim();
            if (!rawQuantity) return;

            const quantity = Number(rawQuantity);
            if (!Number.isFinite(quantity) || quantity <= 0) {
                throw new Error(`Row ${index + 3} has an invalid quantity for "${product.column}".`);
            }

            subscriptions.push({ productName: product.name, quantity });
        });

        customers.push({ displayOrder, name, agentName, subscriptions });
    }

    if (customers.length === 0) {
        throw new Error('Customer file contains no customer rows.');
    }

    return { customers, agentNames };
}

async function listAllDocuments(collectionId) {
    const documents = [];
    let offset = 0;
    let total = 0;

    do {
        const result = await db.listDocuments(dbId, collectionId, [
            Query.limit(batchSize),
            Query.offset(offset),
        ]);
        documents.push(...result.documents);
        total = result.total;
        offset += result.documents.length;
    } while (offset < total);

    return documents;
}

async function createOrUpdateByName(collectionId, name, data, existingByName) {
    const existing = existingByName.get(name.toLocaleLowerCase());
    if (existing) {
        return db.updateDocument(dbId, collectionId, existing.$id, data);
    }

    const created = await db.createDocument(dbId, collectionId, ID.unique(), data);
    existingByName.set(name.toLocaleLowerCase(), created);
    return created;
}

async function seed() {
    const { customers, agentNames } = readCustomers(customerFile);
    console.log(`Read ${customers.length} customers from ${customerFile}.`);

    const companies = await listAllDocuments('companies');
    const company = await createOrUpdateByName(
        'companies',
        companyName,
        { name: companyName, is_active: true },
        new Map(companies.map(document => [document.name.toLocaleLowerCase(), document]))
    );
    console.log(`✓ Company "${companyName}" is ready.`);

    const existingProducts = await listAllDocuments('products');
    const productByName = new Map(
        existingProducts
            .filter(document => document.company_id === company.$id)
            .map(document => [document.name.toLocaleLowerCase(), document])
    );
    const productDocuments = new Map();

    for (const product of products) {
        const document = await createOrUpdateByName(
            'products',
            product.name,
            {
                company_id: company.$id,
                name: product.name,
                unit: 'packet',
                price: product.price,
                is_active: true,
            },
            productByName
        );
        productDocuments.set(product.name, document);
    }
    console.log(`✓ ${products.length} products are ready.`);

    const existingAgents = await listAllDocuments('delivery_agents');
    const agentByName = new Map(
        existingAgents.map(document => [document.name.toLocaleLowerCase(), document])
    );
    const agentDocuments = new Map();

    for (const agentName of [...agentNames].sort()) {
        const document = await createOrUpdateByName(
            'delivery_agents',
            agentName,
            { name: agentName, phone: '', is_active: true },
            agentByName
        );
        agentDocuments.set(agentName, document);
    }
    console.log(`✓ ${agentDocuments.size} delivery agents are ready.`);

    const existingCustomers = await listAllDocuments('customers');
    const customerByName = new Map(
        existingCustomers.map(document => [document.name.toLocaleLowerCase(), document])
    );

    for (let start = 0; start < customers.length; start += batchSize) {
        const batch = customers.slice(start, start + batchSize);
        for (const customer of batch) {
            const subscriptions = customer.subscriptions.map(subscription => ({
                product_id: productDocuments.get(subscription.productName).$id,
                quantity: subscription.quantity,
            }));
            const primarySubscription = subscriptions[0];
            const data = {
                name: customer.name,
                phone: '',
                address: '',
                route_id: null,
                agent_id: agentDocuments.get(customer.agentName).$id,
                billing_cycle: '1-to-last',
                payment_type: 'postpaid',
                subscriptions: JSON.stringify(subscriptions),
                subscribed_product_id: primarySubscription?.product_id || null,
                subscribed_quantity: primarySubscription?.quantity || 1,
                display_order: customer.displayOrder,
                is_active: true,
            };

            await createOrUpdateByName('customers', customer.name, data, customerByName);
        }

        console.log(`✓ Processed customers ${start + 1}-${start + batch.length}.`);
    }

    console.log('\nAppwrite customer import completed. No sample bills, payments, or delivery records were created.');
}

module.exports = { readCustomers };

if (require.main === module) {
    seed().catch(error => {
        console.error('Seeding failed:', error);
        process.exitCode = 1;
    });
}
