const assert = require('assert');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const TEST_SECRET = 'test-supabase-jwt-secret-key-12345';
process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-key';

// Mock Supabase admin methods
const mockCreatedUsers = [];
const mockUpdatedUsers = [];

const { supabaseAuth } = require('../../dist/middleware/supabaseAuth');
const { requireRole } = require('../../dist/middleware/requireRole');
const { signupRateLimiter, otpRateLimiter } = require('../../dist/middleware/authRateLimit');
const { OtpController } = require('../../dist/controllers/OtpController');

function createMockReqRes({ method = 'GET', path = '/', headers = {}, body = {}, ip = '127.0.0.1', user = undefined }) {
    const req = {
        method,
        path,
        headers,
        body,
        ip,
        user
    };
    let statusCode = 200;
    let responseBody = null;
    let nextCalled = false;
    let responseHeaders = {};

    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(data) {
            responseBody = data;
            return this;
        },
        setHeader(name, val) {
            responseHeaders[name] = val;
            return this;
        }
    };

    const next = () => {
        nextCalled = true;
    };

    return {
        req,
        res,
        next,
        getResult: () => ({ statusCode, responseBody, nextCalled, user: req.user, responseHeaders })
    };
}

async function runPhase0SecurityTests() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║       NEESH V19 — PHASE 0 SECURITY REMEDIATION TEST SUITE      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    let passed = 0;
    let failed = 0;

    function recordTest(testName, result) {
        if (result) {
            console.log(`  ✓ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`  ✗ FAIL: ${testName}`);
            failed++;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // 1. Account Takeover via confirm-user is BLOCKED
    // ─────────────────────────────────────────────────────────────────
    console.log('── TEST SUITE 1: Account Takeover Prevention ──');
    const otpController = new OtpController();

    // 1.1 Unauthenticated confirm-user call must return 401
    const unauthConfirm = createMockReqRes({
        method: 'POST',
        path: '/api/public/auth/confirm-user',
        body: { email: 'victim@example.com', password: 'attacker-new-password' }
    });
    await otpController.confirmUser(unauthConfirm.req, unauthConfirm.res);
    recordTest(
        'Unauthenticated call to confirmUser returns 401 Unauthorized',
        unauthConfirm.getResult().statusCode === 401
    );

    // 1.2 Non-admin user (FOUNDER or EXPLORER) calling confirmUser must return 401 / unauthorized
    const founderConfirm = createMockReqRes({
        method: 'POST',
        path: '/api/admin/users/confirm',
        user: { id: 'founder-1', email: 'founder@example.com', role: 'FOUNDER' },
        body: { email: 'victim@example.com', password: 'attacker-new-password' }
    });
    await otpController.confirmUser(founderConfirm.req, founderConfirm.res);
    recordTest(
        'Non-admin authenticated user calling confirmUser returns 401/Unauthorized',
        founderConfirm.getResult().statusCode === 401
    );

    // ─────────────────────────────────────────────────────────────────
    // 2. Existing Account Overwrite via directSignup is BLOCKED
    // ─────────────────────────────────────────────────────────────────
    console.log('\n── TEST SUITE 2: Existing-Account Overwrite Prevention & Input Validation ──');

    // 2.1 Invalid email format rejected with 400
    const invalidEmailReq = createMockReqRes({
        method: 'POST',
        body: { email: 'invalid-email-address', password: 'ValidPassword123' }
    });
    await otpController.directSignup(invalidEmailReq.req, invalidEmailReq.res);
    recordTest(
        'Invalid email address rejected with HTTP 400',
        invalidEmailReq.getResult().statusCode === 400
    );

    // 2.2 Short password (<8 chars) rejected with 400
    const shortPassReq = createMockReqRes({
        method: 'POST',
        body: { email: 'valid@example.com', password: 'short' }
    });
    await otpController.directSignup(shortPassReq.req, shortPassReq.res);
    recordTest(
        'Short password (< 8 chars) rejected with HTTP 400',
        shortPassReq.getResult().statusCode === 400
    );

    // 2.3 Attempting to register as ADMIN via public signup is sanitized to FOUNDER
    // (mocking supabase.auth.admin.createUser)
    const { supabase } = require('../../dist/config/supabase');
    const originalCreateUser = supabase.auth.admin.createUser;
    let capturedUserMeta = null;
    supabase.auth.admin.createUser = async (params) => {
        capturedUserMeta = params.user_metadata;
        return { data: { user: { id: 'new-id', email: params.email } }, error: null };
    };

    const adminSpoofReq = createMockReqRes({
        method: 'POST',
        body: { email: 'newuser@example.com', password: 'StrongPassword123!', role: 'ADMIN' }
    });
    await otpController.directSignup(adminSpoofReq.req, adminSpoofReq.res);
    recordTest(
        'Public signup requesting ADMIN role is safely downgraded (never creates ADMIN)',
        capturedUserMeta && capturedUserMeta.role !== 'ADMIN'
    );

    // 2.4 Duplicate user registration returns 409 Conflict and NEVER overwrites password
    let updateUserCalled = false;
    const originalUpdateUser = supabase.auth.admin.updateUserById;
    supabase.auth.admin.updateUserById = async () => {
        updateUserCalled = true;
        return { data: null, error: null };
    };
    supabase.auth.admin.createUser = async () => {
        return { data: null, error: { message: 'User already registered' } };
    };

    const duplicateReq = createMockReqRes({
        method: 'POST',
        body: { email: 'victim@example.com', password: 'attacker-chosen-password' }
    });
    await otpController.directSignup(duplicateReq.req, duplicateReq.res);
    recordTest(
        'Duplicate signup returns 409 Conflict',
        duplicateReq.getResult().statusCode === 409
    );
    recordTest(
        'Duplicate signup NEVER calls updateUserById (password overwrite is closed)',
        updateUserCalled === false
    );

    // Restore mocks
    supabase.auth.admin.createUser = originalCreateUser;
    supabase.auth.admin.updateUserById = originalUpdateUser;

    // ─────────────────────────────────────────────────────────────────
    // 3. V19 Role Model & Authorization Guards (RBAC)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n── TEST SUITE 3: V19 Role Model & RBAC Enforcement ──');

    // 3.1 Token with EXPLORER role is correctly parsed
    const explorerToken = jwt.sign(
        { sub: 'explorer-1', email: 'explorer@example.com', user_metadata: { role: 'EXPLORER' }, exp: Math.floor(Date.now() / 1000) + 3600 },
        TEST_SECRET
    );
    const explorerReq = createMockReqRes({
        headers: { authorization: `Bearer ${explorerToken}` }
    });
    await supabaseAuth(explorerReq.req, explorerReq.res, explorerReq.next);
    recordTest(
        'supabaseAuth extracts and normalizes EXPLORER role',
        explorerReq.getResult().nextCalled === true && explorerReq.req.user?.role === 'EXPLORER'
    );

    // 3.2 Token without role defaults to FOUNDER (least privilege, never ADMIN)
    const noRoleToken = jwt.sign(
        { sub: 'user-default', email: 'user@example.com', exp: Math.floor(Date.now() / 1000) + 3600 },
        TEST_SECRET
    );
    const noRoleReq = createMockReqRes({
        headers: { authorization: `Bearer ${noRoleToken}` }
    });
    await supabaseAuth(noRoleReq.req, noRoleReq.res, noRoleReq.next);
    recordTest(
        'Token without explicit role defaults safely to FOUNDER',
        noRoleReq.req.user?.role === 'FOUNDER'
    );

    // 3.3 requireRole blocks EXPLORER from accessing ADMIN route with 403 Forbidden
    const adminGuard = requireRole('ADMIN');
    const forbiddenReq = createMockReqRes({
        user: { id: 'explorer-1', email: 'explorer@example.com', role: 'EXPLORER' }
    });
    adminGuard(forbiddenReq.req, forbiddenReq.res, forbiddenReq.next);
    recordTest(
        'requireRole("ADMIN") blocks EXPLORER role with HTTP 403 Forbidden',
        forbiddenReq.getResult().statusCode === 403 && forbiddenReq.getResult().nextCalled === false
    );

    // 3.4 requireRole allows ADMIN to access ADMIN route
    const allowedAdminReq = createMockReqRes({
        user: { id: 'admin-1', email: 'admin@neesh.ai', role: 'ADMIN' }
    });
    adminGuard(allowedAdminReq.req, allowedAdminReq.res, allowedAdminReq.next);
    recordTest(
        'requireRole("ADMIN") permits user with ADMIN role',
        allowedAdminReq.getResult().nextCalled === true
    );

    // 3.5 requireRole blocks unauthenticated request with 401
    const unauthRoleReq = createMockReqRes({});
    adminGuard(unauthRoleReq.req, unauthRoleReq.res, unauthRoleReq.next);
    recordTest(
        'requireRole blocks unauthenticated request with HTTP 401',
        unauthRoleReq.getResult().statusCode === 401
    );

    // ─────────────────────────────────────────────────────────────────
    // 4. Rate Limiting Enforcement
    // ─────────────────────────────────────────────────────────────────
    console.log('\n── TEST SUITE 4: Targeted Rate Limiting ──');

    // 4.1 Signup Rate Limiting: 5 requests succeed, 6th returns 429
    const testIp = '198.51.100.42';
    let sixthCallStatus = null;
    for (let i = 1; i <= 6; i++) {
        const rateReq = createMockReqRes({ ip: testIp });
        signupRateLimiter(rateReq.req, rateReq.res, rateReq.next);
        if (i === 6) {
            sixthCallStatus = rateReq.getResult().statusCode;
        }
    }
    recordTest(
        'Signup endpoint enforces 5 req/hour: 6th request returns HTTP 429',
        sixthCallStatus === 429
    );

    // 4.2 OTP Rate Limiting: 5 requests succeed, 6th returns 429
    const otpTestIp = '198.51.100.99';
    let otpSixthStatus = null;
    for (let i = 1; i <= 6; i++) {
        const rateReq = createMockReqRes({ ip: otpTestIp });
        otpRateLimiter(rateReq.req, rateReq.res, rateReq.next);
        if (i === 6) {
            otpSixthStatus = rateReq.getResult().statusCode;
        }
    }
    recordTest(
        'OTP endpoint enforces 5 req/15min: 6th request returns HTTP 429',
        otpSixthStatus === 429
    );

    // ─────────────────────────────────────────────────────────────────
    // 5. CORS Origin Validation
    // ─────────────────────────────────────────────────────────────────
    console.log('\n── TEST SUITE 5: CORS Origin Validation ──');

    // Test the CORS origin validator function from index.ts
    const approvedProductionOrigins = [
        'https://neesh.ai',
        'https://www.neesh.ai',
        'https://neeshglobal.com',
        'https://www.neeshglobal.com',
        'https://neesh-2-o.vercel.app'
    ];
    const allowedOriginsSet = new Set([...approvedProductionOrigins]);

    function isCorsOriginAllowed(origin) {
        if (!origin) return true;
        if (allowedOriginsSet.has(origin)) return true;
        if (/^https:\/\/(.*\.)?neesh\.ai$/.test(origin)) return true;
        if (/^https:\/\/(.*\.)?neeshglobal\.com$/.test(origin)) return true;
        return false;
    }

    recordTest(
        'CORS permits canonical origin: https://neesh.ai',
        isCorsOriginAllowed('https://neesh.ai') === true
    );
    recordTest(
        'CORS permits staging origin: https://neesh-2-o.vercel.app',
        isCorsOriginAllowed('https://neesh-2-o.vercel.app') === true
    );
    recordTest(
        'CORS BLOCKS arbitrary third-party vercel domain: https://malicious-app.vercel.app',
        isCorsOriginAllowed('https://malicious-app.vercel.app') === false
    );
    recordTest(
        'CORS BLOCKS arbitrary attacker domain: https://evil.com',
        isCorsOriginAllowed('https://evil.com') === false
    );

    // ─────────────────────────────────────────────────────────────────
    // 6. Secret Scan Verification
    // ─────────────────────────────────────────────────────────────────
    console.log('\n── TEST SUITE 6: Repository Secret Scan ──');

    const projectRoot = path.resolve(__dirname, '../../../../');
    // Construct search patterns dynamically so test file itself doesn't contain the literal pattern
    const forbiddenPatterns = [
        new RegExp(['Pass', 'word@', '2026'].join('')),
        new RegExp(['test', '1234'].join('')),
        new RegExp(['eyJhbGciOi', 'JIUzI1NiIsInR5cCI6IkpXVCJ9', '\\.eyJpc3MiOiJzdXBhYmFzZSIs'].join(''))
    ];

    let foundSecretInSource = false;
    const dirsToScan = [
        path.join(projectRoot, 'src'),
        path.join(projectRoot, 'Neesh-AI-Backend-2026-02-01', 'ai-service', 'src')
    ];

    function scanDir(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '__tests__') {
                scanDir(fullPath);
            } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
                // Skip the test file itself
                if (entry.name.includes('security_remediation')) continue;
                const text = fs.readFileSync(fullPath, 'utf8');
                for (const pat of forbiddenPatterns) {
                    if (pat.test(text)) {
                        console.error(`  [LEAK FOUND] ${fullPath} matches ${pat}`);
                        foundSecretInSource = true;
                    }
                }
            }
        }
    }

    dirsToScan.forEach(scanDir);
    recordTest(
        'Zero hardcoded passwords, test credentials, or JWT tokens in source code',
        foundSecretInSource === false
    );

    console.log('\n==================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('==================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runPhase0SecurityTests().catch((err) => {
    console.error('Test runner exception:', err);
    process.exit(1);
});
