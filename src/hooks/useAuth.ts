import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  is_approved: boolean;
  allowed_pages: string[];
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "member";
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("user_roles").select("*").eq("user_id", userId),
    ]);
    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (rolesRes.data) setRoles(rolesRes.data as UserRole[]);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Await fetchProfile before finishing loading to prevent redirect bugs
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.some(r => r.role === "admin");
  const isApproved = profile?.is_approved ?? false;

  const canAccessPage = (path: string) => {
    if (isAdmin) return true;
    if (!isApproved) return false;
    const pages = profile?.allowed_pages ?? [];
    // SECURITY FIX: Default deny if no permissions are explicitly set
    if (pages.length === 0) return false; 
    return pages.some(p => {
      if (path === p) return true;
      // Allow sub-routes: if user has /kpi/overview, also allow /kpi/evaluate/... /kpi/report/...
      const topSection = "/" + p.split("/").filter(Boolean)[0];
      return path.startsWith(topSection + "/");
    });
  };

  return {
    user, session, profile, roles, loading,
    signUp, signIn, signOut,
    isAdmin, isApproved, canAccessPage,
    refetchProfile: () => user ? fetchProfile(user.id) : Promise.resolve(),
  };
}
