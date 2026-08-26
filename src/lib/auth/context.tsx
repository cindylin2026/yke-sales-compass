/**
 * Auth context — wraps Supabase session + current user profile.
 * Consumed by useAuth() throughout the app.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, authLinkType } from "@/lib/supabase/client";

const IS_INVITE_OR_RECOVERY_LINK = authLinkType === "invite" || authLinkType === "recovery";
import type { User } from "@/lib/crm/types";

interface AuthContextValue {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  profile: User | null;
  loading: boolean;
  /** True right after landing here via an invite/recovery email link —
   *  the session exists but the user has never set a password yet. */
  needsPasswordSetup: boolean;
  clearPasswordSetup: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile({
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        role: data.role as User["role"],
        region: data.region as User["region"],
        title: data.title ?? "",
        avatar_initials:
          data.avatar_initials ??
          data.full_name
            .split(" ")
            .map((p: string) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
        active: data.active,
      });
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user && IS_INVITE_OR_RECOVERY_LINK) {
        setNeedsPasswordSetup(true);
      }
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        setSession(s);
        // Supabase only reliably fires "PASSWORD_RECOVERY" for type=recovery
        // links — an invite link arrives as a plain "SIGNED_IN" event, so we
        // also fall back to the hash `type` snapshotted at module load.
        if (event === "PASSWORD_RECOVERY" || (s?.user && IS_INVITE_OR_RECOVERY_LINK)) {
          setNeedsPasswordSetup(true);
        }
        if (s?.user) {
          loadProfile(s.user.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const clearPasswordSetup = useCallback(() => setNeedsPasswordSetup(false), []);

  return (
    <AuthContext.Provider
      value={{
        session,
        supabaseUser: session?.user ?? null,
        profile,
        loading,
        needsPasswordSetup,
        clearPasswordSetup,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
