import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Route guard specifically for the Admin Dashboard.
 *
 * Two-layer check:
 * 1. Supabase auth — unauthenticated users go to /login.
 * 2. Admin email domain — non-admin accounts go to /dashboard.
 *
 * The domain check (email ending in @neeshai.com / @neeshi.ai) survives page
 * refresh because Supabase persists the session. The token-level check (admin
 * password) is handled inside AdminDashboard via useAdminAuth.
 */

// Admin-qualifying email domains (mirrors Login.tsx heuristic).
function isAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    const lower = email.toLowerCase();
    return lower.endsWith('@neeshai.com') || lower.endsWith('@neeshi.ai');
}

interface ProtectedAdminRouteProps {
    children: React.ReactNode;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
    const { user, loading } = useAuthContext();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    // Layer 1: must be authenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Layer 2: must have an admin-qualifying email domain
    if (!isAdminEmail(user.email)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};
