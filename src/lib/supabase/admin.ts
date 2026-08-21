/**
 * Server-only admin actions — the ONLY file allowed to touch the Supabase
 * service role key. Runs exclusively inside createServerFn handlers, which
 * TanStack Start strips from the client bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import type { Region, UserRole } from "@/lib/crm/types";

interface InviteTeamMemberInput {
  accessToken: string;
  email: string;
  full_name: string;
  role: UserRole;
  region: Region;
  title?: string | undefined;
}

export const inviteTeamMember = createServerFn({ method: "POST" })
  .validator((data: InviteTeamMemberInput) => data)
  .handler(async ({ data }) => {
    const url = process.env["VITE_SUPABASE_URL"];
    const anonKey = process.env["VITE_SUPABASE_ANON_KEY"];
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !anonKey || !serviceKey) {
      throw new Error("Supabase server environment variables are not configured.");
    }

    // Identify the caller from their access token — RLS applies, so this
    // client can only ever see what the caller is already allowed to see.
    const callerClient = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    const { data: authData, error: authError } = await callerClient.auth.getUser(data.accessToken);
    if (authError || !authData.user) {
      throw new Error("Not authenticated.");
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from("profiles")
      .select("role, organization_id")
      .eq("id", authData.user.id)
      .single();
    if (profileError || !callerProfile) {
      throw new Error("Could not verify caller profile.");
    }
    if (callerProfile.role !== "admin") {
      throw new Error("Only admins can invite team members.");
    }

    // Elevated client — only used to create the auth user. The DB trigger
    // `handle_new_user` reads this metadata off auth.users and creates the
    // matching profiles row itself, so we never insert into profiles here.
    const adminClient = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: {
          full_name: data.full_name,
          role: data.role,
          region: data.region,
          title: data.title || null,
          organization_id: callerProfile.organization_id,
        },
      },
    );
    if (inviteError || !invited.user) {
      throw new Error(inviteError?.message ?? "Failed to invite user.");
    }

    return { id: invited.user.id };
  });
