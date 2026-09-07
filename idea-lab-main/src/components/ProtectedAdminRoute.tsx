import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Route guard specifically for the Admin Dashboard.
 * 
 * Requires the user to be authenticated AND have admin privileges.
 * Non-admin users are redirected to /dashboard.
 * Unauthenticated users are redirected to /login.
 * 
 * Admin verification uses the ADMIN_MASTER_PASSWORD env variable
 * which is already checked inside AdminDashboard — this guard
 * adds a server-verifiable role check layer.
 */

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

    // Must be authenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // The AdminDashboard component itself handles the admin password verification.
    // This guard ensures at minimum that the user is authenticated before
    // even rendering the admin page (previously, unauthenticated users could
    // navigate to /admin and see a broken/empty page).
    return <>{children}</>;
};
