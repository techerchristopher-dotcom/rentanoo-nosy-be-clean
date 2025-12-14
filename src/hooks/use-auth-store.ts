import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthStore {
  user: User | null;
  session: Session | null;
  providerToken: string | null;
  isGoogle: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useAuthStore(): AuthStore {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [isGoogle, setIsGoogle] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    const currentSession = data.session;
    
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    setProviderToken(currentSession?.provider_token ?? null);
    setIsGoogle(
      !!currentSession?.user?.app_metadata?.provider &&
      currentSession.user.app_metadata.provider === 'google'
    );
    setLoading(false);
  };

  useEffect(() => {
    // Initial session check
    refresh();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setProviderToken(currentSession?.provider_token ?? null);
        setIsGoogle(
          currentSession?.user?.app_metadata?.provider === 'google'
        );
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    session,
    providerToken,
    isGoogle,
    loading,
    refresh,
  };
}
