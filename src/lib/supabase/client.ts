/**
 * Supabase browser client — safe to import in any component.
 * Uses the anon key only. All data access is enforced by RLS.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string;
const SUPABASE_ANON_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. " +
    "Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Supabase's `detectSessionInUrl` consumes and strips the URL hash almost
// immediately, and only fires the "PASSWORD_RECOVERY" auth event for
// type=recovery links — an invite link lands as a plain "SIGNED_IN" event
// with no way to tell it apart after the fact. Snapshot the hash's `type`
// param at module load (before anything strips it) so callers can still
// tell "this session just arrived via an invite/recovery link" afterward.
export const authLinkType =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type")
    : null;
