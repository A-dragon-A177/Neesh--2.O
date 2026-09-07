import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Route guard for authenticated pages.
 * 
 * Wraps page components that require authentication. If the user is not
 * logged in, they are redirected to /login. If auth is still loading,
 * a minimal loading state is shown.
 * 
 * Does NOT modify the wrapped component — it renders identically for
 * authenticated users.
 */

interface ProtectedRouteProps {
    children: React.ReactNode;
    redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
    children, 
    redirectTo = '/login' 
}) => {
    const { user, loading } = useAuthContext();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
};
