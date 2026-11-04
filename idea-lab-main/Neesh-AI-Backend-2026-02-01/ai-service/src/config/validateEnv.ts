/**
 * Validates that all required environment variables are present on startup.
 * 
 * Fails fast with a clear error message listing which variables are missing,
 * rather than letting the application start and crash later with cryptic errors.
 */

const REQUIRED_VARS = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET',
    'API_KEY_ENCRYPTION_SECRET',
];

const OPTIONAL_BUT_RECOMMENDED = [
    { name: 'OPENAI_API_KEY', description: 'Required for RAG embeddings' },
    { name: 'GEMINI_API_KEY', description: 'Required for public chat fallback' },
    { name: 'AI_SERVICE_INTERNAL_API_KEY', alternates: ['INTERNAL_API_KEY'], description: 'Required for Spring Boot ↔ AI-service auth' },
    { name: 'REDIS_URL', description: 'Recommended for persistent cache (falls back to in-memory)' },
    { name: 'CASHFREE_APP_ID', description: 'Required for Cashfree Payment Gateway integration' },
    { name: 'CASHFREE_SECRET_KEY', description: 'Required for Cashfree Payment Gateway integration' },
    { name: 'CASHFREE_WEBHOOK_SECRET', description: 'Required for Cashfree webhook signature verification (falls back to CASHFREE_SECRET_KEY if unset)' },
    { name: 'ADMIN_TOKEN_SECRET', description: 'Required for admin JWT signing — server will throw at first admin token operation if unset' },
    { name: 'ADMIN_USERNAME', description: 'Required for admin login endpoint — endpoint will return 503 if unset' },
    { name: 'ADMIN_PASSWORD', description: 'Required for admin login endpoint — endpoint will return 503 if unset' },
];

export function validateEnvironment(): void {
    const missing: string[] = [];

    for (const varName of REQUIRED_VARS) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    if (missing.length > 0) {
        console.error('╔══════════════════════════════════════════════════════════════╗');
        console.error('║  FATAL: Missing required environment variables              ║');
        console.error('╠══════════════════════════════════════════════════════════════╣');
        for (const v of missing) {
            console.error(`║  ✗ ${v.padEnd(55)}║`);
        }
        console.error('╠══════════════════════════════════════════════════════════════╣');
        console.error('║  Set these in your deployment platform (Render/Railway/     ║');
        console.error('║  Vercel) or in a local .env file.                           ║');
        console.error('╚══════════════════════════════════════════════════════════════╝');
        process.exit(1);
    }

    // Warn about optional but recommended variables
    for (const opt of OPTIONAL_BUT_RECOMMENDED) {
        const hasVar = process.env[opt.name] || 
            (opt.alternates || []).some(alt => process.env[alt]);
        if (!hasVar) {
            console.warn(`[EnvValidation] ⚠ ${opt.name} is not set. ${opt.description}`);
        }
    }

    console.log('[EnvValidation] ✓ All required environment variables are present');
}
