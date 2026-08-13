import { Request, Response, NextFunction } from 'express';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute per IP
const MAX_MAP_SIZE = 10000; // Cap map size to prevent unbounded memory growth

// Clean up expired rate limit entries every minute
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
        if (now > record.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, WINDOW_MS).unref(); // unref so timer doesn't block process shutdown

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const now = Date.now();

    // Prevent map from overflowing under DDoS / massive IP space scan
    if (rateLimitMap.size >= MAX_MAP_SIZE && !rateLimitMap.has(ip)) {
        // Evict first expired or any key
        for (const [k, v] of rateLimitMap.entries()) {
            if (now > v.resetTime) {
                rateLimitMap.delete(k);
                break;
            }
        }
        if (rateLimitMap.size >= MAX_MAP_SIZE) {
            const firstKey = rateLimitMap.keys().next().value;
            if (firstKey) rateLimitMap.delete(firstKey);
        }
    }

    let record = rateLimitMap.get(ip);
    if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + WINDOW_MS };
        rateLimitMap.set(ip, record);
        return next();
    }

    if (record.count >= MAX_REQUESTS) {
        return res.status(429).json({
            error: 'Too Many Requests',
            message: 'AI service rate limit exceeded. Please try again later.'
        });
    }

    record.count++;
    return next();
}
