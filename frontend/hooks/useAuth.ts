"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User as SupabaseUser, AuthChangeEvent, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    void supabase.auth.getUser().then((result: Awaited<ReturnType<typeof supabase.auth.getUser>>) => {
      setUser(result.data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
}
