import { Request, Response, NextFunction } from 'express';
import { UserRole } from './supabaseAuth';

/**
 * Role-based authorization middleware.
 * Separates authentication from authorization (PRD Section Y.12 & Phase 0 Requirement 4).
 * 
 * Usage:
 *   app.use('/api/admin', supabaseAuth, requireRole('ADMIN'));
 *   app.get('/api/explorers/feed', supabaseAuth, requireRole('EXPLORER', 'ADMIN'), ...);
 */
export function requireRole(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication token required.'
            });
        }

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {
            console.warn(`[RBAC] Access denied: User ${req.user.id} with role '${userRole}' attempted to access endpoint requiring one of [${allowedRoles.join(', ')}]`);
            return res.status(403).json({
                error: 'Forbidden',
                message: `Insufficient permissions for this action. Required role: ${allowedRoles.join(' or ')}.`
            });
        }

        return next();
    };
}

