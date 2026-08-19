'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

// Stable singleton — createClient() must NOT be called inside the component body
// because each new reference causes the useEffect to re-run, producing an
// infinite loop of getUser() network calls.
const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    // Select only the fields consumers actually need — avoids fetching large columns
    const { data } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, role, roles, primary_crop, location, phone_number, verification_level, trust_score')
      .eq('user_id', userId)
      .maybeSingle();
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // getSession() reads from local storage — no network round-trip.
      // The middleware already validates the JWT via getUser() on every request,
      // so a client-side getSession() is safe and fast here.
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) await fetchProfile(currentUser.id);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Memoize the context value so that unchanged references don't trigger
  // re-renders in all consuming components.
  const value = useMemo(
    () => ({ user, profile, loading, signOut }),
    [user, profile, loading, signOut]
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

export const useAuth = () => useContext(AuthContext);
