import { Request, Response, NextFunction } from 'express';

/**
 * Prompt injection sanitization middleware for chat endpoints.
 * 
 * Runs BEFORE the chat controller to filter known prompt injection patterns
 * from user queries. Does NOT block requests — it sanitizes the input and
 * allows the request to proceed. Normal user queries pass through unchanged.
 * 
 * This is defense-in-depth. The LLM still receives the user's query,
 * just with injection patterns replaced by [filtered].
 */

const INJECTION_PATTERNS: RegExp[] = [
    // Direct instruction override attempts
    /ignore\s+(all\s+)?(previous|above|prior|earlier|preceding)\s+(instructions|prompts|rules|context|guidelines)/gi,
    /disregard\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions|prompts|rules)/gi,
    /forget\s+(all|everything|your|the)\s+(previous|earlier|prior)?\s*(instructions|rules|context|guidelines|training)/gi,
    
    // System prompt extraction attempts
    /(?:output|reveal|show|display|print|repeat|echo)\s+(?:the\s+)?(?:full\s+)?(?:system|initial|original)\s*prompt/gi,
    /what\s+(?:is|are)\s+your\s+(?:system\s+)?(?:prompt|instructions|rules|guidelines)/gi,
    
    // Role hijacking attempts
    /you\s+are\s+now\s+(?:a|an|the)/gi,
    /pretend\s+(?:you(?:'re|\s+are)|to\s+be)/gi,
    /act\s+as\s+(?:a|an|if)/gi,
    /from\s+now\s+on\s+you\s+(?:are|will|must|should)/gi,
    
    // Jailbreak keywords
    /\bDAN\b(?:\s+mode)?/g,
    /\bjailbreak\b/gi,
    /\bdevmode\b/gi,
    /developer\s+mode/gi,
];

export function sanitizeChatInput(req: Request, res: Response, next: NextFunction) {
    const query = req.body?.query;
    
    // If no query or not a string, let the controller handle validation
    if (!query || typeof query !== 'string') {
        return next();
    }

    let sanitized = query;
    let injectionDetected = false;

    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(sanitized)) {
            injectionDetected = true;
            // Reset regex lastIndex (important for /g flag patterns)
            pattern.lastIndex = 0;
            sanitized = sanitized.replace(pattern, '[filtered]');
        }
    }

    if (injectionDetected) {
        console.warn(`[InputSanitizer] Prompt injection pattern detected from IP: ${req.ip}`);
    }

    // Enforce maximum query length (defense in depth — controller has its own check too)
    if (sanitized.length > 2000) {
        sanitized = sanitized.substring(0, 2000);
    }

    // Replace the query in the request body — controller receives sanitized input
    req.body.query = sanitized;
    next();
}
