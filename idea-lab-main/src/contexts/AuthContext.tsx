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

const globalObj = typeof window !== 'undefined' ? (window as any) : (globalThis as any);
const AuthContext = globalObj.__NEESH_AUTH_CONTEXT__ || (globalObj.__NEESH_AUTH_CONTEXT__ = createContext<AuthContextType | undefined>(undefined));

const defaultAuthValue: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  signOut: async () => ({ error: null }),
  signUp: async () => ({ data: null, error: null }),
  signIn: async () => ({ data: null, error: null }),
  signInWithGoogle: async () => ({ data: null, error: null }),
  signInWithGithub: async () => ({ data: null, error: null }),
  syncWithBackend: async () => {},
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Guards to prevent auth event loop
  const syncedUserIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const syncWithBackend = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        return;
      }

      await apiClient.get('/api/users/me');
    } catch (error: any) {
      if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
        console.warn('[AuthContext] Backend sync failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const handlePostLoginRedirect = () => {
      try {
        const redirectUrl = sessionStorage.getItem('post_login_redirect');
        if (redirectUrl) {
          sessionStorage.removeItem('post_login_redirect');

          let safeUrl = redirectUrl;
          try {
            if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
              const parsed = new URL(redirectUrl);
              if (parsed.origin !== window.location.origin) {
                safeUrl = `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
              }
            }
          } catch {
            safeUrl = `${window.location.origin}/dashboard`;
          }

          const currentClean = window.location.href.split('#')[0].split('?')[0];
          const targetClean = safeUrl.split('#')[0].split('?')[0];
          if (currentClean !== targetClean) {
            setTimeout(() => {
              window.location.href = safeUrl;
            }, 100);
          }
        }
      } catch (e) {
        console.error('[AuthContext] Error restoring post-login redirect:', e);
      }
    };

    const initSession = async () => {
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

    // Listen to state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;

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
    const cleanEmail = email.trim().toLowerCase();

    return await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
  };

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    return await supabase.auth.signInWithPassword({ email: cleanEmail, password });
  };

  const resolveAbsoluteRedirectUrl = (redirectTo?: string): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (!redirectTo || redirectTo.trim() === '') {
      return origin ? `${origin}/dashboard` : '/dashboard';
    }
    if (redirectTo.startsWith('/')) {
      return `${origin}${redirectTo}`;
    }
    if (!redirectTo.startsWith('http://') && !redirectTo.startsWith('https://')) {
      return `${origin}/${redirectTo}`;
    }
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
      const { error } = await supabase.auth.signOut();
      syncedUserIdRef.current = null;
      currentUserIdRef.current = null;
      setSession(null);
      setUser(null);
      return { error };
    } catch (error) {
      console.error('[AuthContext] signOut exception:', error);
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
    console.warn("[AuthContext] useAuthContext accessed before or outside AuthProvider, using fallback safe state");
    return defaultAuthValue;
  }
  return context;
};

export { AuthContext };
