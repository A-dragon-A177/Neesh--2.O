import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import apiClient from "@/lib/api";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ data: any; error: any }>;
  signInWithGithub: (redirectTo?: string) => Promise<{ data: any; error: any }>;
  syncWithBackend: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Guards to prevent the auth event loop ──
  // Track which user ID we've already synced so we never sync twice for the same session
  const syncedUserIdRef = useRef<string | null>(null);
  // Track the current user ID to skip redundant setUser/setSession calls
  const currentUserIdRef = useRef<string | null>(null);

  const syncWithBackend = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        return;
      }

      console.log('[AuthContext] Syncing user with backend...');
      await apiClient.get('/api/users/me');
      console.log('[AuthContext] User synced with backend successfully');
    } catch (error: any) {
      if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
        console.warn('[AuthContext] Backend sync failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    console.log('[AuthContext] Initializing Supabase Auth Provider...');
    let isMounted = true;

    const handlePostLoginRedirect = () => {
      try {
        const redirectUrl = sessionStorage.getItem('post_login_redirect');
        if (redirectUrl) {
          sessionStorage.removeItem('post_login_redirect');
          const currentClean = window.location.href.split('#')[0].split('?')[0];
          const targetClean = redirectUrl.split('#')[0].split('?')[0];
          if (currentClean !== targetClean) {
            console.log('[AuthContext] Restoring post-login redirect to:', redirectUrl);
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 100);
          }
        }
      } catch (e) {
        console.error('[AuthContext] Error restoring post-login redirect:', e);
      }
    };

    const initSession = async () => {
      // Check if we have the mock session in local storage first
      const mockStorage = localStorage.getItem('sb-mock-auth-token');
      if (mockStorage) {
        try {
          const parsed = JSON.parse(mockStorage);
          if (parsed.user && parsed.access_token === "mock-token") {
            const mockSession: Session = {
              access_token: "mock-token",
              refresh_token: "mock-refresh-token",
              expires_in: 3600,
              token_type: "bearer",
              user: parsed.user
            };
            if (!isMounted) return;
            setSession(mockSession);
            setUser(parsed.user);
            currentUserIdRef.current = parsed.user.id;
            setLoading(false);
            return;
          }
        } catch (e) { }
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[AuthContext] getSession returned error:', error.message);
        }
        if (!isMounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          currentUserIdRef.current = initialSession.user.id;
          handlePostLoginRedirect();
        }
      } catch (err: any) {
        // AbortError is normal when unmounting or navigating away
        if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
          return;
        }
        console.error('[AuthContext] Error getting initial session:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    // Listen to state changes (but ignore if we are using the mock session)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      // If we are currently using a mock session, don't overwrite it with real auth changes
      if (localStorage.getItem('sb-mock-auth-token')) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        currentUserIdRef.current = newSession.user.id;
        handlePostLoginRedirect();
      } else {
        currentUserIdRef.current = null;
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    return await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
  };

  const signIn = async (email: string, password: string) => {
    const isMockAuthEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK_AUTH === "true";
    if (isMockAuthEnabled && email.toLowerCase() === "test@example.com" && password === "test1234") {
      console.log('[AuthContext] Bypassing login with mock credentials');
      const mockUser: User = {
        id: "d564fa72-c288-466d-88f2-2bbdf19a6b18",
        email: "test@example.com",
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { name: "Test User" },
        aud: "authenticated",
        role: "authenticated"
      };
      const mockSession: Session = {
        access_token: "mock-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser
      };

      // Store mock session token in local storage so that safeGetSession in api.ts finds it
      localStorage.setItem('sb-mock-auth-token', JSON.stringify({
        access_token: "mock-token",
        user: mockUser
      }));

      setSession(mockSession);
      setUser(mockUser);
      currentUserIdRef.current = mockUser.id;
      return { data: { user: mockUser, session: mockSession }, error: null };
    }
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const resolveAbsoluteRedirectUrl = (redirectTo?: string): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (!redirectTo || redirectTo.trim() === '') {
      return origin ? `${origin}/dashboard` : '/dashboard';
    }
    // If it's a relative path (e.g. "/dashboard" or "dashboard")
    if (redirectTo.startsWith('/')) {
      return `${origin}${redirectTo}`;
    }
    if (!redirectTo.startsWith('http://') && !redirectTo.startsWith('https://')) {
      return `${origin}/${redirectTo}`;
    }
    // If it's an absolute URL, check whether it points to an old deployment domain
    try {
      const parsed = new URL(redirectTo);
      if (origin && parsed.origin !== origin && (parsed.hostname.includes('vercel.app') || parsed.hostname.includes('localhost'))) {
        return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return redirectTo;
    } catch {
      return origin ? `${origin}/dashboard` : '/dashboard';
    }
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const targetUrl = resolveAbsoluteRedirectUrl(redirectTo);
    try {
      sessionStorage.setItem('post_login_redirect', targetUrl);
    } catch {}
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: targetUrl },
    });
  };

  const signInWithGithub = async (redirectTo?: string) => {
    const targetUrl = resolveAbsoluteRedirectUrl(redirectTo);
    try {
      sessionStorage.setItem('post_login_redirect', targetUrl);
    } catch {}
    return await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: targetUrl },
    });
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('sb-mock-auth-token');
      const { error } = await supabase.auth.signOut();
      syncedUserIdRef.current = null;
      currentUserIdRef.current = null;
      setSession(null);
      setUser(null);
      return { error };
    } catch (error) {
      console.error('[AuthContext] signOut exception:', error);
      localStorage.removeItem('sb-mock-auth-token');
      syncedUserIdRef.current = null;
      currentUserIdRef.current = null;
      setSession(null);
      setUser(null);
      return { error: null };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signOut,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithGithub,
      syncWithBackend
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

export { AuthContext };
