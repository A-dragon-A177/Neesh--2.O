import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

/**
 * Factory for creating custom in-memory rate limiters with specific windows and max requests.
 */
export function createRateLimiter(options: {
    windowMs: number;
    maxRequests: number;
    limiterName: string;
    errorMessage?: string;
}) {
    const limitMap = new Map<string, RateLimitRecord>();
    const MAX_MAP_SIZE = 5000;

    // Periodically clean expired entries
    setInterval(() => {
        const now = Date.now();
        for (const [ip, record] of limitMap.entries()) {
            if (now > record.resetTime) {
                limitMap.delete(ip);
            }
        }
    }, Math.min(options.windowMs, 60 * 1000)).unref();

    return function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
        const now = Date.now();

        // Evict if map exceeds maximum allowed size
        if (limitMap.size >= MAX_MAP_SIZE && !limitMap.has(ip)) {
            for (const [k, v] of limitMap.entries()) {
                if (now > v.resetTime) {
                    limitMap.delete(k);
                    break;
                }
            }
            if (limitMap.size >= MAX_MAP_SIZE) {
                const firstKey = limitMap.keys().next().value;
                if (firstKey) limitMap.delete(firstKey);
            }
        }

        let record = limitMap.get(ip);
        if (!record || now > record.resetTime) {
            record = { count: 1, resetTime: now + options.windowMs };
            limitMap.set(ip, record);
            return next();
        }

        if (record.count >= options.maxRequests) {
            console.warn(`[${options.limiterName}] Rate limit exceeded for IP: ${ip} (${record.count}/${options.maxRequests})`);
            const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
            res.setHeader('Retry-After', retryAfterSec.toString());
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: options.errorMessage || `Too many attempts from this IP. Please try again later.`,
                retryAfter: retryAfterSec
            });
        }

        record.count++;
        return next();
    };
}

/**
 * Strict signup rate limiter: maximum 5 signup attempts per hour per IP (PRD Section AC.1 / Phase 0 requirement).
 */
export const signupRateLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    limiterName: 'SignupRateLimit',
    errorMessage: 'Too many signup attempts from this IP. Please try again in an hour.'
});

/**
 * OTP rate limiter: maximum 5 OTP attempts per 15 minutes per IP.
 */
export const otpRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    limiterName: 'OtpRateLimit',
    errorMessage: 'Too many OTP requests from this IP. Please try again later.'
});

/**
 * Password reset rate limiter: maximum 5 reset attempts per 15 minutes per IP.
 */
export const passwordResetRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    limiterName: 'PasswordResetRateLimit',
    errorMessage: 'Too many password reset attempts. Please try again in 15 minutes.'
});

