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
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("*").eq("user_id", userId),
      ]);

      return {
        profile: (profileRes.data ?? null) as Profile | null,
        roles: (rolesRes.data ?? []) as UserRole[],
      };
    } catch (error) {
      console.error("Error fetching profile data:", error);
      return {
        profile: null,
        roles: [] as UserRole[],
      };
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    const syncAuthState = async (nextSession: Session | null) => {
      const currentRequestId = ++requestId;
      const nextUser = nextSession?.user ?? null;

      if (mounted) {
        setSession(nextSession);
        setUser(nextUser);
      }

      if (!nextUser) {
        if (mounted) {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
        return;
      }

      const { profile: nextProfile, roles: nextRoles } = await fetchProfile(nextUser.id);

      if (!mounted || currentRequestId !== requestId) return;

      setProfile(nextProfile);
      setRoles(nextRoles);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted || event === "INITIAL_SESSION") return;

      // TOKEN_REFRESHED is a silent background operation — the user identity has not
      // changed, only the JWT was rotated. Updating session without setLoading(true)
      // prevents the full-page spinner from flashing every ~55 minutes.
      if (event === "TOKEN_REFRESHED") {
        if (mounted) setSession(nextSession);
        return;
      }

      setLoading(true);
      // setTimeout(0) defers to avoid Supabase's internal deadlock on synchronous auth events
      window.setTimeout(() => {
        if (!mounted) return;
        void syncAuthState(nextSession);
      }, 0);
    });

    void supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) throw error;
        await syncAuthState(session);
      })
      .catch((error) => {
        console.error("Auth initialization error:", error);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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

  const isAdmin = roles.some((r) => r.role === "admin");
  const isApproved = profile?.is_approved ?? false;

  const canAccessPage = (path: string) => {
    if (isAdmin) return true;
    if (!isApproved) return false;
    const pages = profile?.allowed_pages ?? [];
    if (pages.includes('*')) return true;
    if (pages.length === 0) return false;
    return pages.some((p) => {
      const normalizedPath = path.startsWith("/") ? path : "/" + path;
      const normalizedP = p.startsWith("/") ? p : "/" + p;
      if (normalizedPath === normalizedP) return true;
      const topSection = "/" + normalizedP.split("/").filter(Boolean)[0];
      return normalizedPath.startsWith(topSection + "/");
    });
  };

  return {
    user,
    session,
    profile,
    roles,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
    isApproved,
    canAccessPage,
    refetchProfile: async () => {
      if (!user) return;
      const { profile: nextProfile, roles: nextRoles } = await fetchProfile(user.id);
      setProfile(nextProfile);
      setRoles(nextRoles);
    },
  };
}
