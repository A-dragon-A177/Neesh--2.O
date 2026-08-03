import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

interface User {
    id: string;
    email: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

export const supabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.substring(7);

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const jwtSecret = process.env.SUPABASE_JWT_SECRET;
        let userId: string | undefined;
        let userEmail: string | undefined;

        if (jwtSecret) {
            const decoded = jwt.verify(token, jwtSecret) as any;
            userId = decoded.sub;
            userEmail = decoded.email || decoded.user_metadata?.email || '';
        } else {
            // Verify token via Supabase Auth API
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error || !user) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
            userId = user.id;
            userEmail = user.email || '';
        }

        if (!userId) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }

        req.user = {
            id: userId,
            email: userEmail || ''
        };

        next();
    } catch (error: any) {
        console.error('[Auth] Token verification error:', error.message || error);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};