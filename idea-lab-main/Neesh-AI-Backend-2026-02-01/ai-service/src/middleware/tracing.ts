import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface TracedRequest extends Request {
    requestId?: string;
    startTime?: number;
}

export function tracingMiddleware(req: TracedRequest, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.requestId = requestId;
    req.startTime = Date.now();

    res.setHeader('X-Request-ID', requestId);

    // Capture response completion for log telemetry
    res.on('finish', () => {
        const durationMs = Date.now() - (req.startTime || Date.now());
        require('../services/MetricsRegistry').metricsRegistry.recordRequest(durationMs, res.statusCode);
        
        // Structured JSON log line
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
            requestId: req.requestId,
            method: req.method,
            endpoint: req.originalUrl || req.url,
            statusCode: res.statusCode,
            durationMs,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        };

        console.log(JSON.stringify(logEntry));
    });

    next();
}

/**
 * PII and Secret Redaction Utility
 */
export function redactSensitiveData(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const SensitiveKeys = [
        'authorization', 'jwt', 'token', 'apiKey', 'secret',
        'signature', 'x-webhook-signature', 'x-internal-secret',
        'password', 'creditCard'
    ];

    const redacted = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(redacted)) {
        const lowerKey = key.toLowerCase();
        if (SensitiveKeys.some(s => lowerKey.includes(s))) {
            redacted[key] = typeof redacted[key] === 'boolean' ? redacted[key] : '[REDACTED]';
        } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
            redacted[key] = redactSensitiveData(redacted[key]);
        }
    }

    return redacted;
}
