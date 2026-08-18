/**
 * SupabaseCrmRepository — implements CrmRepository against live Supabase.
 *
 * This is the only file that contains Supabase queries.
 * The UI never imports supabase directly — it calls services/ which call this.
 */
import { supabase } from "./client";
import type { Database } from "./types";
import type {
  Account,
  Campaign,
  Contact,
  ConvertLeadInput,
  ConvertLeadResult,
  CrmDatabase,
  ID,
  Interaction,
  Lead,
  LeadLifecycleStage,
  Opportunity,
  Task,
  User,
} from "@/lib/crm/types";

type DbAccount = Database["public"]["Tables"]["accounts"]["Row"];
type DbContact = Database["public"]["Tables"]["contacts"]["Row"];
type DbLead = Database["public"]["Tables"]["leads"]["Row"];
type DbOpportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type DbInteraction = Database["public"]["Tables"]["interactions"]["Row"];
type DbTask = Database["public"]["Tables"]["tasks"]["Row"];
type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbCampaign = Database["public"]["Tables"]["campaigns"]["Row"];

// ── Mappers: DB rows → CRM types ─────────────────────────────

function mapProfile(r: DbProfile): User {
  return {
    id: r.id,
    full_name: r.full_name,
    email: r.email,
    role: r.role,
    region: r.region,
    title: r.title ?? "",
    avatar_initials: r.avatar_initials ?? r.full_name.slice(0, 2).toUpperCase(),
  };
}

function mapAccount(r: DbAccount): Account {
  return {
    id: r.id,
    name: r.name,
    domain: r.domain ?? undefined,
    segment: (r.segment as Account["segment"]) ?? "Hotel",
    region: (r.region as Account["region"]) ?? "US",
    country: r.country ?? "",
    city: r.city ?? undefined,
    status: r.status as Account["status"],
    account_fit_score: r.account_fit_score,
    employee_count: r.employee_count ?? undefined,
    locations_count: r.locations_count ?? undefined,
    owner_user_id: r.owner_id,
    notes: r.notes ?? undefined,
    created_at: r.created_at,
  };
}

function mapContact(r: DbContact): Contact {
  return {
    id: r.id,
    account_id: r.account_id ?? "",
    first_name: r.first_name,
    last_name: r.last_name,
    title: r.title ?? undefined,
    email: r.email ?? "",
    phone: r.phone ?? undefined,
    is_primary: r.is_primary,
    owner_user_id: r.owner_id,
    originating_lead_id: r.originating_lead_id ?? undefined,
    created_at: r.created_at,
  };
}

function mapLead(r: DbLead): Lead {
  return {
    id: r.id,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email ?? "",
    phone: r.phone ?? undefined,
    title: r.title ?? undefined,
    company_name: r.company_name,
    company_domain: r.company_domain ?? undefined,
    region: r.region,
    source: r.source as Lead["source"],
    source_detail: r.source_detail ?? undefined,
    campaign_id: r.campaign_id ?? undefined,
    lifecycle_stage: r.lifecycle_stage as LeadLifecycleStage,
    lead_score: r.lead_score,
    owner_user_id: r.owner_id,
    notes: r.notes ?? undefined,
    last_contacted_at: r.last_contacted_at ?? undefined,
    next_action: r.next_action ?? undefined,
    created_at: r.created_at,
    lifecycle_history: [], // loaded separately when needed
    converted_at: r.converted_at ?? undefined,
    converted_account_id: r.converted_account_id ?? undefined,
    converted_contact_id: r.converted_contact_id ?? undefined,
    converted_opportunity_id: r.converted_opportunity_id ?? undefined,
  };
}

function mapOpportunity(r: DbOpportunity): Opportunity {
  return {
    id: r.id,
    name: r.name,
    account_id: r.account_id,
    primary_contact_id: r.primary_contact_id ?? null,
    owner_user_id: r.owner_id,
    stage: r.stage as Opportunity["stage"],
    amount: r.amount,
    probability: r.probability,
    expected_close_date: r.expected_close_date ?? "",
    next_action: r.next_action ?? undefined,
    region: (r.region as Opportunity["region"]) ?? "US",
    originating_lead_id: r.originating_lead_id ?? undefined,
    created_at: r.created_at,
    closed_at: r.closed_at ?? undefined,
  };
}

function mapInteraction(r: DbInteraction): Interaction {
  return {
    id: r.id,
    type: r.type as Interaction["type"],
    occurred_at: r.occurred_at,
    owner_user_id: r.owner_id,
    account_id: r.account_id ?? undefined,
    contact_id: r.contact_id ?? undefined,
    lead_id: r.lead_id ?? undefined,
    opportunity_id: r.opportunity_id ?? undefined,
    subject: r.subject,
    notes: r.notes ?? undefined,
    next_steps: r.next_steps ?? undefined,
    next_action: r.next_action ?? undefined,
    next_action_due_date: r.next_action_due_date ?? undefined,
    source_doc_url: r.google_doc_url ?? undefined,
    ai_summary: r.ai_summary ?? undefined,
    ai_summary_status: (r.ai_summary_status as Interaction["ai_summary_status"]) ?? "none",
    created_at: r.created_at,
  };
}

function mapTask(r: DbTask): Task {
  return {
    id: r.id,
    title: r.title,
    type: r.type as Task["type"],
    priority: r.priority as Task["priority"],
    status: r.status as Task["status"],
    due_date: r.due_date,
    owner_user_id: r.owner_id,
    lead_id: r.lead_id ?? undefined,
    account_id: r.account_id ?? undefined,
    contact_id: r.contact_id ?? undefined,
    opportunity_id: r.opportunity_id ?? undefined,
    next_action: r.next_action ?? undefined,
    created_at: r.created_at,
    completed_at: r.completed_at ?? undefined,
  };
}

function mapCampaign(r: DbCampaign): Campaign {
  return {
    id: r.id,
    name: r.name,
    channel: r.channel as Campaign["channel"],
    region: r.region as Campaign["region"],
    start_date: r.start_date ?? "",
    end_date: r.end_date ?? undefined,
    budget: r.budget ?? undefined,
    is_active: r.is_active,
  };
}

// ── Fetch helpers ─────────────────────────────────────────────

async function fetchAll<T>(
  query: ReturnType<typeof supabase.from>,
  mapper: (r: never) => T,
): Promise<T[]> {
  const PAGE = 1000;
  const results: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await (query as ReturnType<typeof supabase.from>)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []).map(mapper as (r: unknown) => T);
    results.push(...page);
    if (page.length < PAGE) break;   // last page
    from += PAGE;
  }

  return results;
}

// ── Public API ────────────────────────────────────────────────

export async function fetchSnapshot(): Promise<CrmDatabase> {
  const [users, accounts, contacts, leads, opportunities, interactions, tasks, campaigns] =
    await Promise.all([
      fetchAll(supabase.from("profiles"), mapProfile as (r: never) => User),
      fetchAll(supabase.from("accounts"), mapAccount as (r: never) => Account),
      fetchAll(supabase.from("contacts"), mapContact as (r: never) => Contact),
      fetchAll(supabase.from("leads"), mapLead as (r: never) => Lead),
      fetchAll(supabase.from("opportunities"), mapOpportunity as (r: never) => Opportunity),
      fetchAll(supabase.from("interactions"), mapInteraction as (r: never) => Interaction),
      fetchAll(supabase.from("tasks"), mapTask as (r: never) => Task),
      fetchAll(supabase.from("campaigns"), mapCampaign as (r: never) => Campaign),
    ]);

  // Attach stage history to leads
  const allHistory: { lead_id: string; new_stage: string; changed_at: string; changed_by: string | null; note: string | null }[] = [];
  let hFrom = 0;
  while (true) {
    const { data: page } = await supabase
      .from("lead_stage_history")
      .select("*")
      .order("changed_at", { ascending: true })
      .range(hFrom, hFrom + 999);
    if (!page || page.length === 0) break;
    allHistory.push(...page);
    if (page.length < 1000) break;
    hFrom += 1000;
  }

  const historyByLead = new Map<string, Lead["lifecycle_history"]>();
  for (const h of allHistory) {
    const arr = historyByLead.get(h.lead_id) ?? [];
    arr.push({
      stage: h.new_stage as LeadLifecycleStage,
      changed_at: h.changed_at,
      changed_by_user_id: h.changed_by ?? "",
      note: h.note ?? undefined,
    });
    historyByLead.set(h.lead_id, arr);
  }
  for (const lead of leads) {
    lead.lifecycle_history = historyByLead.get(lead.id) ?? [];
  }

  return { users, accounts, contacts, leads, opportunities, interactions, tasks, campaigns };
}

// ── Mutations ─────────────────────────────────────────────────

export async function dbUpdateLeadStage(
  leadId: ID,
  stage: LeadLifecycleStage,
  note?: string,
): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ lifecycle_stage: stage, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  if (note) {
    await supabase.from("lead_stage_history").insert({ lead_id: leadId, new_stage: stage, note });
  }
}

export async function dbAssignLead(leadId: ID, ownerUserId: ID | null): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ owner_id: ownerUserId, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
}

export async function dbCreateLead(
  lead: Omit<Lead, "id" | "created_at" | "lifecycle_history">,
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      organization_id: await getOrgId(),
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email || null,
      phone: lead.phone || null,
      title: lead.title || null,
      company_name: lead.company_name,
      company_domain: lead.company_domain || null,
      region: lead.region,
      source: lead.source,
      source_detail: lead.source_detail || null,
      campaign_id: lead.campaign_id || null,
      lifecycle_stage: lead.lifecycle_stage,
      lead_score: lead.lead_score,
      owner_id: lead.owner_user_id || null,
      notes: lead.notes || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapLead(data as DbLead);
}

export async function dbConvertLead(input: ConvertLeadInput): Promise<ConvertLeadResult> {
  const { data, error } = await supabase.rpc("convert_lead", {
    p_lead_id: input.lead_id,
    p_account_id: input.account_id,
    p_new_account: input.new_account ? JSON.stringify(input.new_account) : null,
    p_contact_id: input.contact_id,
    p_create_contact: input.create_contact,
    p_create_opportunity: input.create_opportunity,
    p_opportunity: input.opportunity ? JSON.stringify(input.opportunity) : null,
    p_owner_id: input.owner_user_id,
  });
  if (error) throw new Error(error.message);
  const result = data as {
    lead_id: string;
    account_id: string;
    contact_id: string;
    opportunity_id: string | null;
  };
  return {
    lead_id: result.lead_id,
    account_id: result.account_id,
    contact_id: result.contact_id,
    opportunity_id: result.opportunity_id,
  };
}

export async function dbCreateOpportunity(
  opp: Omit<Opportunity, "id" | "created_at">,
): Promise<Opportunity> {
  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      organization_id: await getOrgId(),
      name: opp.name,
      account_id: opp.account_id,
      primary_contact_id: opp.primary_contact_id,
      owner_id: opp.owner_user_id || null,
      stage: opp.stage,
      amount: opp.amount,
      probability: opp.probability,
      expected_close_date: opp.expected_close_date || null,
      next_action: opp.next_action || null,
      region: opp.region,
      originating_lead_id: opp.originating_lead_id || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapOpportunity(data as DbOpportunity);
}

export async function dbUpdateOpportunityStage(
  oppId: ID,
  stage: Opportunity["stage"],
): Promise<void> {
  const closedAt = stage === "Won" || stage === "Lost" ? new Date().toISOString() : null;
  const probability = stage === "Won" ? 100 : stage === "Lost" ? 0 : undefined;
  const { error } = await supabase
    .from("opportunities")
    .update({
      stage,
      ...(probability !== undefined ? { probability } : {}),
      closed_at: closedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", oppId);
  if (error) throw new Error(error.message);
}

export async function dbCreateInteraction(
  interaction: Omit<Interaction, "id" | "created_at">,
): Promise<Interaction> {
  const { data, error } = await supabase
    .from("interactions")
    .insert({
      organization_id: await getOrgId(),
      type: interaction.type,
      occurred_at: interaction.occurred_at,
      owner_id: interaction.owner_user_id || null,
      account_id: interaction.account_id || null,
      contact_id: interaction.contact_id || null,
      lead_id: interaction.lead_id || null,
      opportunity_id: interaction.opportunity_id || null,
      subject: interaction.subject,
      notes: interaction.notes || null,
      next_steps: interaction.next_steps || null,
      next_action: interaction.next_action || null,
      next_action_due_date: interaction.next_action_due_date || null,
      google_doc_url: interaction.source_doc_url || null,
      ai_summary_status: interaction.ai_summary_status ?? "none",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapInteraction(data as DbInteraction);
}

export async function dbRequestAiSummary(interactionId: ID): Promise<void> {
  await supabase
    .from("interactions")
    .update({ ai_summary_status: "pending" })
    .eq("id", interactionId);
  // TODO: trigger AI summarizer edge function here
}

export async function dbCreateTask(task: Omit<Task, "id" | "created_at">): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: await getOrgId(),
      title: task.title,
      type: task.type,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date,
      owner_id: task.owner_user_id || null,
      lead_id: task.lead_id || null,
      account_id: task.account_id || null,
      contact_id: task.contact_id || null,
      opportunity_id: task.opportunity_id || null,
      next_action: task.next_action || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapTask(data as DbTask);
}

export async function dbCompleteTask(taskId: ID): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ status: "Completed", completed_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
}

export async function dbReopenTask(taskId: ID): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ status: "Open", completed_at: null })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
}

// ── Duplicate detection ───────────────────────────────────────

export async function findDuplicateAccounts(name: string, domain?: string): Promise<Account[]> {
  let query = supabase.from("accounts").select("*").ilike("name", `%${name}%`);

  if (domain) {
    query = supabase
      .from("accounts")
      .select("*")
      .or(`name.ilike.%${name}%,domain.ilike.%${domain}%`);
  }

  const { data } = await query.limit(5);
  return (data ?? []).map(mapAccount as (r: unknown) => Account);
}

export async function findDuplicateContacts(email: string): Promise<Contact[]> {
  const { data } = await supabase.from("contacts").select("*").ilike("email", email).limit(5);
  return (data ?? []).map(mapContact as (r: unknown) => Contact);
}

export async function findDuplicateLeads(email: string): Promise<Lead[]> {
  const { data } = await supabase.from("leads").select("*").ilike("email", email).limit(5);
  return (data ?? []).map(mapLead as (r: unknown) => Lead);
}

// ── Generic row editor (spreadsheet-style data grid) ────────────
// Operates on raw DB columns rather than the mapped app types above —
// used only by the admin "Data Editor" page, which is meant to expose
// the real table shape directly (like editing the sheet used to be).

export type EditableTable =
  "accounts" | "contacts" | "leads" | "opportunities" | "tasks" | "campaigns";

export async function dbListRows(table: EditableTable): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function dbUpdateRow(
  table: EditableTable,
  id: ID,
  patch: Record<string, unknown>,
): Promise<void> {
  // Dynamic table names defeat supabase-js's per-table generated types.
  const { error } = await (supabase.from(table) as ReturnType<typeof supabase.from>)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function dbInsertRow(
  table: EditableTable,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const orgId = await getOrgId();
  const { data, error } = await (supabase.from(table) as ReturnType<typeof supabase.from>)
    .insert({ ...row, organization_id: orgId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function dbDeleteRow(table: EditableTable, id: ID): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Helpers ───────────────────────────────────────────────────

async function getOrgId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!data) throw new Error("Profile not found");
  return data.organization_id as string;
}
