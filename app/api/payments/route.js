import { getDatabases, DATABASE_ID, COLLECTIONS, Query, ID } from '@/lib/appwrite';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customer_id');
        const billId = searchParams.get('bill_id');
        const db = getDatabases();

        const queries = [Query.orderDesc('payment_date'), Query.limit(100)];
        if (customerId) queries.push(Query.equal('customer_id', customerId));
        if (billId) queries.push(Query.equal('bill_id', billId));

        const [paymentsRes, customersRes, bankAccountsRes, billsRes] = await Promise.all([
            db.listDocuments(DATABASE_ID, COLLECTIONS.PAYMENTS, queries),
            db.listDocuments(DATABASE_ID, COLLECTIONS.CUSTOMERS, [Query.limit(500)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.BANK_ACCOUNTS, [Query.limit(100)]),
            db.listDocuments(DATABASE_ID, COLLECTIONS.BILLS, [Query.limit(500)])
        ]);

        const customerMap = {};
        customersRes.documents.forEach(c => customerMap[c.$id] = c.name);

        const bankMap = {};
        bankAccountsRes.documents.forEach(ba => bankMap[ba.$id] = ba.bank_name);

        const billMap = {};
        billsRes.documents.forEach(b => billMap[b.$id] = b);

        const payments = paymentsRes.documents.map(py => {
            const bill = billMap[py.bill_id] || {};
            return {
                id: py.$id,
                ...py,
                customer_name: customerMap[py.customer_id] || '',
                bank_name: bankMap[py.bank_account_id] || '',
                period_start: bill.period_start || '',
                period_end: bill.period_end || ''
            };
        });

        return NextResponse.json(payments);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { bill_id, customer_id, amount, mode, bank_account_id, payment_date, notes } = await request.json();
        const db = getDatabases();

        const paymentDoc = await db.createDocument(
            DATABASE_ID,
            COLLECTIONS.PAYMENTS,
            ID.unique(),
            {
                bill_id: bill_id || null,
                customer_id,
                amount: parseFloat(amount),
                mode: mode || 'cash',
                bank_account_id: bank_account_id || null,
                payment_date: payment_date || new Date().toISOString().split('T')[0],
                notes: notes || ''
            }
        );

        // Update bill status if associated with a bill (replacing PostgreSQL trigger)
        if (bill_id) {
            const allBillPayments = await db.listDocuments(DATABASE_ID, COLLECTIONS.PAYMENTS, [
                Query.equal('bill_id', bill_id),
                Query.limit(500)
            ]);

            const totalPaid = allBillPayments.documents.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            const bill = await db.getDocument(DATABASE_ID, COLLECTIONS.BILLS, bill_id);

            let status = 'pending';
            if (totalPaid >= parseFloat(bill.total_amount)) {
                status = 'paid';
            } else if (totalPaid > 0) {
                status = 'partial';
            }

            await db.updateDocument(DATABASE_ID, COLLECTIONS.BILLS, bill_id, {
                paid_amount: totalPaid,
                status
            });
        }

        return NextResponse.json({ id: paymentDoc.$id, ...paymentDoc }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
