import { useState, useCallback } from 'react';
import { storeAdminToken } from '@/lib/adminApi';

// Admin token lives in module memory (adminApi.ts) only — never persisted to localStorage.
// Re-login is required on page refresh, which is the correct trade-off for an admin session.

export const useAdminAuth = () => {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [loading] = useState(false);

  const adminLogin = useCallback((token: string, displayName: string) => {
    storeAdminToken(token);
    setAdminToken(token);
    setAdminName(displayName);
  }, []);

  const adminLogout = useCallback(() => {
    storeAdminToken(null);
    setAdminToken(null);
    setAdminName(null);
  }, []);

  return {
    adminToken,
    adminName,
    isAdmin: !!adminToken,
    loading,
    adminLogin,
    adminLogout,
  };
};

