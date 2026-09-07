import { Request, Response, NextFunction } from 'express';

/**
 * Stricter rate limiter specifically for PUBLIC (unauthenticated) endpoints.
 * 
 * Separate from the global rate limiter (30 req/min for authenticated users).
 * Public endpoints that call paid LLM APIs (Gemini/OpenAI) need aggressive
 * rate limiting to prevent financial abuse.
 * 
 * Configuration:
 * - 5 requests per minute per IP for public endpoints
 * - Auto-cleanup of expired entries every minute
 * - Capped map size to prevent memory exhaustion under DDoS
 */

const publicLimitMap = new Map<string, { count: number; resetTime: number }>();
const PUBLIC_WINDOW_MS = 60 * 1000;       // 1 minute window
const PUBLIC_MAX_REQUESTS = 5;             // 5 requests per minute for unauthenticated
const MAX_MAP_SIZE = 5000;                 // Cap map size

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of publicLimitMap.entries()) {
        if (now > record.resetTime) {
            publicLimitMap.delete(ip);
        }
    }
}, PUBLIC_WINDOW_MS).unref();

export function publicRateLimiter(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const now = Date.now();

    // Prevent map overflow
    if (publicLimitMap.size >= MAX_MAP_SIZE && !publicLimitMap.has(ip)) {
        for (const [k, v] of publicLimitMap.entries()) {
            if (now > v.resetTime) {
                publicLimitMap.delete(k);
                break;
            }
        }
        if (publicLimitMap.size >= MAX_MAP_SIZE) {
            const firstKey = publicLimitMap.keys().next().value;
            if (firstKey) publicLimitMap.delete(firstKey);
        }
    }

    let record = publicLimitMap.get(ip);
    if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + PUBLIC_WINDOW_MS };
        publicLimitMap.set(ip, record);
        return next();
    }

    if (record.count >= PUBLIC_MAX_REQUESTS) {
        console.warn(`[PublicRateLimit] Rate limit exceeded for IP: ${ip}`);
        return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests from this IP. Please try again in a minute.',
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
    }

    record.count++;
    return next();
}
