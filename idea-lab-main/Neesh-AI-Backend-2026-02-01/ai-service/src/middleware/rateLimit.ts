import { Request, Response, NextFunction } from 'express';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute per IP

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const now = Date.now();

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
