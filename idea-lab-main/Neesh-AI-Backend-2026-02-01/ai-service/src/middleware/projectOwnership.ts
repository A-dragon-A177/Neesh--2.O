import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export async function requireProjectOwnership(req: Request, res: Response, next: NextFunction) {
    try {
        // Extract project ID from various route parameter patterns
        const projectId = req.params.projectId || req.params.id;
        const userId = req.user?.id;

        // If no project ID in the route, skip ownership check — let the controller handle it
        if (!projectId) {
            return next();
        }

        // If no user (unauthenticated), skip — the supabaseAuth middleware handles auth rejection
        if (!userId) {
            return next();
        }

        // Verify the authenticated user owns this project
        const { data, error } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('owner_id', userId)
            .eq('deleted', false)
            .maybeSingle();

        if (error || !data) {
            console.warn(`[ProjectOwnership] Access denied: user ${userId} does not own project ${projectId}`);
            return res.status(403).json({ 
                error: 'Access denied',
                message: 'You do not have permission to access this project'
            });
        }

        // Ownership verified — proceed to the existing controller handler
        next();
    } catch (error) {
        console.error('[ProjectOwnership] Ownership check error:', error);
        // On error, deny access (fail secure)
        return res.status(500).json({ error: 'Internal error during authorization check' });
    }
}
