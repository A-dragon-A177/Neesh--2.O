const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-supabase-jwt-secret-key-12345';
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
process.env.SUPABASE_URL = 'https://dummy.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key';

const { supabaseAuth } = require('./src/middleware/supabaseAuth');

function createMockReqRes(authHeader) {
    const req = {
        headers: {
            authorization: authHeader
        }
    };
    let statusCode = 200;
    let responseBody = null;
    let nextCalled = false;

    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(data) {
            responseBody = data;
            return this;
        }
    };

    const next = () => {
        nextCalled = true;
    };

    return { req, res, next, getResult: () => ({ statusCode, responseBody, nextCalled, user: req.user }) };
}

async function runTests() {
    console.log("==================================================");
    console.log("  JWT VERIFICATION TEST SUITE (AI SERVICE)");
    console.log("==================================================\n");

    // 1. Case A: Valid Token
    const validToken = jwt.sign(
        { sub: 'd564fa72-c288-466d-88f2-2bbdf19a6b18', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) + 3600 },
        TEST_SECRET
    );
    const caseA = createMockReqRes(`Bearer ${validToken}`);
    await supabaseAuth(caseA.req, caseA.res, caseA.next);
    console.log("[CASE A] Valid Token:");
    console.log("  Status Code:", caseA.getResult().statusCode);
    console.log("  Next Called:", caseA.getResult().nextCalled);
    console.log("  Authenticated User:", caseA.getResult().user);
    console.log("  RESULT:", caseA.getResult().nextCalled && caseA.getResult().user?.id ? "PASSED (200 OK)" : "FAILED");
    console.log("--------------------------------------------------");

    // 2. Case B: Tampered Token (Payload modified without re-signing)
    const parts = validToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    payload.sub = '00000000-0000-0000-0000-000000000000';
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayloadB64}.${parts[2]}`;

    const caseB = createMockReqRes(`Bearer ${tamperedToken}`);
    await supabaseAuth(caseB.req, caseB.res, caseB.next);
    console.log("[CASE B] Tampered Payload (Invalid Signature):");
    console.log("  Status Code:", caseB.getResult().statusCode);
    console.log("  Response Body:", caseB.getResult().responseBody);
    console.log("  RESULT:", caseB.getResult().statusCode === 401 ? "PASSED (401 Unauthorized)" : "FAILED");
    console.log("--------------------------------------------------");

    // 3. Case C: Expired Token
    const expiredToken = jwt.sign(
        { sub: 'd564fa72-c288-466d-88f2-2bbdf19a6b18', email: 'test@example.com', exp: Math.floor(Date.now() / 1000) - 3600 },
        TEST_SECRET
    );
    const caseC = createMockReqRes(`Bearer ${expiredToken}`);
    await supabaseAuth(caseC.req, caseC.res, caseC.next);
    console.log("[CASE C] Expired Token:");
    console.log("  Status Code:", caseC.getResult().statusCode);
    console.log("  Response Body:", caseC.getResult().responseBody);
    console.log("  RESULT:", caseC.getResult().statusCode === 401 ? "PASSED (401 Unauthorized)" : "FAILED");
    console.log("--------------------------------------------------");

    // 4. Case D: Garbage / Malformed Token
    const caseD = createMockReqRes("Bearer invalid.garbage.token.string");
    await supabaseAuth(caseD.req, caseD.res, caseD.next);
    console.log("[CASE D] Garbage / Malformed Token:");
    console.log("  Status Code:", caseD.getResult().statusCode);
    console.log("  Response Body:", caseD.getResult().responseBody);
    console.log("  RESULT:", caseD.getResult().statusCode === 401 ? "PASSED (401 Unauthorized)" : "FAILED");
    console.log("==================================================");
}

runTests();
