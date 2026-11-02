import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

export type UserRole = 'FOUNDER' | 'EXPLORER' | 'ADMIN';

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
    rawMetadata?: Record<string, any>;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}

/**
 * Normalizes user role string to one of the canonical V19 roles: FOUNDER, EXPLORER, ADMIN.
 * Safe default is FOUNDER. Under no circumstance can an invalid or missing role default to ADMIN.
 */
function normalizeRole(rawRole?: string | null): UserRole {
    if (!rawRole) return 'FOUNDER';
    const normalized = rawRole.toUpperCase().trim();
    if (normalized === 'ADMIN') return 'ADMIN';
    if (normalized === 'EXPLORER') return 'EXPLORER';
    return 'FOUNDER';
}

export const supabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
    // OPTIONS preflight requests do not carry Authorization headers
    if (req.method === 'OPTIONS') {
        return next();
    }

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const jwtSecret = process.env.SUPABASE_JWT_SECRET;
        let userId: string | undefined;
        let userEmail: string | undefined;
        let rawRole: string | undefined;
        let metadata: Record<string, any> = {};

        if (jwtSecret) {
            try {
                const decoded = jwt.verify(token, jwtSecret) as any;
                userId = decoded.sub;
                userEmail = decoded.email || decoded.user_metadata?.email || '';
                metadata = decoded.user_metadata || decoded.app_metadata || {};
                rawRole = decoded.user_metadata?.role || decoded.app_metadata?.role || decoded.role;
            } catch (jwtErr) {
                // If local HS256 verify fails (e.g. project upgraded to ES256 / JWKS), fallback to Supabase getUser API
                const { data: { user }, error } = await supabase.auth.getUser(token);
                if (error || !user) {
                    return res.status(401).json({ error: 'Invalid or expired token' });
                }
                userId = user.id;
                userEmail = user.email || '';
                metadata = user.user_metadata || user.app_metadata || {};
                rawRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;
            }
        } else {
            // Verify token via Supabase Auth API
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error || !user) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
            userId = user.id;
            userEmail = user.email || '';
            metadata = user.user_metadata || user.app_metadata || {};
            rawRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;
        }

        if (!userId) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }

        req.user = {
            id: userId,
            email: userEmail || '',
            role: normalizeRole(rawRole),
            rawMetadata: metadata
        };

        next();
    } catch (error: any) {
        console.error('[Auth] Token verification error:', error.message || error);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
