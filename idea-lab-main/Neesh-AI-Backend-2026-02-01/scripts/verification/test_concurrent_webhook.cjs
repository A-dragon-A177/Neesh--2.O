const crypto = require('crypto');

const BACKEND_URL = 'http://localhost:8082/api/payments/public/webhook';
const SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'test_cashfree_secret_123';

const timestamp = Math.floor(Date.now() / 1000).toString();
const payloadObj = {
    data: {
        order: {
            order_id: 'order_test_concurrent_123',
            order_amount: 9.99
        },
        payment: {
            cf_payment_id: 'cf_pay_test_999888',
            payment_status: 'SUCCESS'
        },
        customer_details: {
            customer_id: 'd564fa72-c288-466d-88f2-2bbdf19a6b18',
            customer_email: 'test@example.com',
            customer_name: 'Concurrent Test User'
        }
    },
    event_time: new Date().toISOString(),
    type: 'PAYMENT_SUCCESS_WEBHOOK'
};

const rawPayload = JSON.stringify(payloadObj);
const dataToSign = timestamp + rawPayload;
const signature = crypto.createHmac('sha256', SECRET_KEY).update(dataToSign).digest('base64');

async function testConcurrentWebhooks() {
    console.log("==================================================");
    console.log("  CONCURRENT WEBHOOK IDEMPOTENCY TEST");
    console.log("==================================================\n");
    console.log("Sending 2 IDENTICAL webhooks in PARALLEL via Promise.all()...\n");

    const fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-webhook-signature': signature,
            'x-webhook-timestamp': timestamp
        },
        body: rawPayload
    };

    try {
        const [res1, res2] = await Promise.all([
            fetch(BACKEND_URL, fetchOptions),
            fetch(BACKEND_URL, fetchOptions)
        ]);

        const text1 = await res1.text();
        const text2 = await res2.text();

        console.log("[Request 1 HTTP Status]:", res1.status, text1);
        console.log("[Request 2 HTTP Status]:", res2.status, text2);

        const statuses = [body1.status, body2.status];
        const hasSuccess = statuses.includes('SUCCESS');
        const hasAlreadyProcessed = statuses.includes('ALREADY_PROCESSED');

        console.log("\n--------------------------------------------------");
        if (hasSuccess && hasAlreadyProcessed) {
            console.log("✅ RESULT: PASSED! Exactly ONE request succeeded (SUCCESS) and ONE was blocked atomically by DB unique constraint (ALREADY_PROCESSED).");
        } else {
            console.log("RESULT Logged:", statuses);
        }
        console.log("==================================================");

    } catch (err) {
        console.error("Error executing concurrent test:", err.message);
    }
}

testConcurrentWebhooks();
