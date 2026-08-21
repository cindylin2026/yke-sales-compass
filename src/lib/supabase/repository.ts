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
  DisqualifyReason,
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
    active: r.active,
  };
}

function mapAccount(r: DbAccount): Account {
  return {
    id: r.id,
    name: r.name,
    domain: r.domain ?? undefined,
    segment: (r.segment as Account["segment"]) ?? "Unknown",
    region: (r.region as Account["region"]) ?? "Unknown",
    market: r.market ?? undefined,
    country: r.country ?? "",
    city: r.city ?? undefined,
    status: r.status as Account["status"],
    account_fit_score: r.account_fit_score,
    employee_count: r.employee_count ?? undefined,
    locations_count: r.locations_count ?? undefined,
    owner_user_id: r.owner_id,
    notes: r.notes ?? undefined,
    foot_traffic_score: r.foot_traffic_score ?? undefined,
    utility_readiness_score: r.utility_readiness_score ?? undefined,
    brand_alignment_score: r.brand_alignment_score ?? undefined,
    contract_complexity_score: r.contract_complexity_score ?? undefined,
    decision_maker_accessibility_score: r.decision_maker_accessibility_score ?? undefined,
    expansion_potential_score: r.expansion_potential_score ?? undefined,
    operating_hours_per_day: r.operating_hours_per_day ?? undefined,
    operating_days_per_year: r.operating_days_per_year ?? undefined,
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
    market: r.market ?? undefined,
    segment: (r.segment as Lead["segment"]) ?? undefined,
    source: r.source as Lead["source"],
    source_detail: r.source_detail ?? undefined,
    campaign_id: r.campaign_id ?? undefined,
    lifecycle_stage: r.lifecycle_stage as LeadLifecycleStage,
    lead_score: r.lead_score,
    owner_user_id: r.owner_id,
    notes: r.notes ?? undefined,
    last_contacted_at: r.last_contacted_at ?? undefined,
    created_at: r.created_at,
    lifecycle_history: [], // loaded separately when needed
    converted_at: r.converted_at ?? undefined,
    converted_account_id: r.converted_account_id ?? undefined,
    converted_contact_id: r.converted_contact_id ?? undefined,
    converted_opportunity_id: r.converted_opportunity_id ?? undefined,
    disqualify_reason: (r.disqualify_reason as Lead["disqualify_reason"]) ?? undefined,
    foot_traffic_score: r.foot_traffic_score ?? undefined,
    utility_readiness_score: r.utility_readiness_score ?? undefined,
    brand_alignment_score: r.brand_alignment_score ?? undefined,
    contract_complexity_score: r.contract_complexity_score ?? undefined,
    decision_maker_accessibility_score: r.decision_maker_accessibility_score ?? undefined,
    expansion_potential_score: r.expansion_potential_score ?? undefined,
    site_fit_score: r.site_fit_score ?? undefined,
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
    boba_machine_qty: r.boba_machine_qty,
    ramen_machine_qty: r.ramen_machine_qty,
    avg_daily_boba_units_low: r.avg_daily_boba_units_low,
    avg_daily_boba_units_high: r.avg_daily_boba_units_high,
    avg_daily_ramen_units_low: r.avg_daily_ramen_units_low,
    avg_daily_ramen_units_high: r.avg_daily_ramen_units_high,
    amount_low: r.amount_low,
    amount_high: r.amount_high,
    probability: r.probability,
    expected_close_date: r.expected_close_date ?? "",
    next_action: r.next_action ?? undefined,
    region: (r.region as Opportunity["region"]) ?? "Unknown",
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
    if (page.length < PAGE) break; // last page
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
  const allHistory: {
    lead_id: string;
    new_stage: string;
    changed_at: string;
    changed_by: string | null;
    note: string | null;
  }[] = [];
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
  disqualifyReason?: DisqualifyReason,
): Promise<void> {
  const { error } = await supabase.rpc("update_lead_stage", {
    p_lead_id: leadId,
    p_new_stage: stage,
    p_note: note ?? null,
    p_disqualify_reason: disqualifyReason ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function dbUpdateLeadFitCriteria(
  leadId: ID,
  criteria: Pick<
    Lead,
    | "foot_traffic_score"
    | "utility_readiness_score"
    | "brand_alignment_score"
    | "contract_complexity_score"
    | "decision_maker_accessibility_score"
    | "expansion_potential_score"
  >,
): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({
      foot_traffic_score: criteria.foot_traffic_score ?? null,
      utility_readiness_score: criteria.utility_readiness_score ?? null,
      brand_alignment_score: criteria.brand_alignment_score ?? null,
      contract_complexity_score: criteria.contract_complexity_score ?? null,
      decision_maker_accessibility_score: criteria.decision_maker_accessibility_score ?? null,
      expansion_potential_score: criteria.expansion_potential_score ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
}

export async function dbAssignLead(leadId: ID, ownerUserId: ID | null): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ owner_id: ownerUserId, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
}

export async function dbUpdateProfile(
  userId: ID,
  patch: Partial<Pick<User, "role" | "region" | "title" | "active">>,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      ...(patch.role !== undefined ? { role: patch.role } : {}),
      ...(patch.region !== undefined ? { region: patch.region } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function dbUpdateAccount(
  accountId: ID,
  patch: Partial<
    Pick<
      Account,
      | "name"
      | "domain"
      | "segment"
      | "region"
      | "market"
      | "country"
      | "city"
      | "status"
      | "employee_count"
      | "locations_count"
      | "notes"
    >
  >,
): Promise<void> {
  const { error } = await supabase
    .from("accounts")
    .update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.domain !== undefined ? { domain: patch.domain || null } : {}),
      ...(patch.segment !== undefined ? { segment: patch.segment } : {}),
      ...(patch.region !== undefined ? { region: patch.region } : {}),
      ...(patch.market !== undefined ? { market: patch.market || null } : {}),
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.city !== undefined ? { city: patch.city || null } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.employee_count !== undefined
        ? { employee_count: patch.employee_count ?? null }
        : {}),
      ...(patch.locations_count !== undefined
        ? { locations_count: patch.locations_count ?? null }
        : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes || null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);
  if (error) throw new Error(error.message);
}

export async function dbUpdateLeadDetails(
  leadId: ID,
  patch: Partial<
    Pick<
      Lead,
      | "first_name"
      | "last_name"
      | "email"
      | "phone"
      | "title"
      | "company_name"
      | "company_domain"
      | "region"
      | "market"
      | "segment"
      | "source_detail"
      | "notes"
    >
  >,
): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({
      ...(patch.first_name !== undefined ? { first_name: patch.first_name } : {}),
      ...(patch.last_name !== undefined ? { last_name: patch.last_name } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
      ...(patch.title !== undefined ? { title: patch.title || null } : {}),
      ...(patch.company_name !== undefined ? { company_name: patch.company_name } : {}),
      ...(patch.company_domain !== undefined
        ? { company_domain: patch.company_domain || null }
        : {}),
      ...(patch.region !== undefined ? { region: patch.region } : {}),
      ...(patch.market !== undefined ? { market: patch.market || null } : {}),
      ...(patch.segment !== undefined ? { segment: patch.segment } : {}),
      ...(patch.source_detail !== undefined ? { source_detail: patch.source_detail || null } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes || null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
}

export async function dbUpdateContact(
  contactId: ID,
  patch: Partial<
    Pick<Contact, "first_name" | "last_name" | "title" | "email" | "phone" | "is_primary">
  >,
): Promise<void> {
  const { error } = await supabase
    .from("contacts")
    .update({
      ...(patch.first_name !== undefined ? { first_name: patch.first_name } : {}),
      ...(patch.last_name !== undefined ? { last_name: patch.last_name } : {}),
      ...(patch.title !== undefined ? { title: patch.title || null } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
      ...(patch.is_primary !== undefined ? { is_primary: patch.is_primary } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);
  if (error) throw new Error(error.message);
}

export async function dbCreateContact(
  contact: Omit<Contact, "id" | "created_at">,
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      organization_id: await getOrgId(),
      account_id: contact.account_id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      title: contact.title || null,
      email: contact.email || null,
      phone: contact.phone || null,
      is_primary: contact.is_primary,
      owner_id: contact.owner_user_id,
      originating_lead_id: contact.originating_lead_id || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapContact(data as DbContact);
}

export async function dbCreateAccount(
  account: Omit<Account, "id" | "created_at" | "account_fit_score"> & {
    account_fit_score?: number;
  },
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      organization_id: await getOrgId(),
      name: account.name,
      domain: account.domain || null,
      segment: account.segment,
      region: account.region,
      country: account.country,
      city: account.city || null,
      status: account.status,
      account_fit_score: account.account_fit_score ?? 50,
      employee_count: account.employee_count ?? null,
      locations_count: account.locations_count ?? null,
      owner_id: account.owner_user_id || null,
      notes: account.notes || null,
      foot_traffic_score: account.foot_traffic_score ?? null,
      utility_readiness_score: account.utility_readiness_score ?? null,
      brand_alignment_score: account.brand_alignment_score ?? null,
      contract_complexity_score: account.contract_complexity_score ?? null,
      decision_maker_accessibility_score: account.decision_maker_accessibility_score ?? null,
      expansion_potential_score: account.expansion_potential_score ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapAccount(data as DbAccount);
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
      segment: lead.segment ?? "Unknown",
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
      amount: 0, // overwritten by the compute_opportunity_amount trigger
      amount_low: 0, // overwritten by the compute_opportunity_amount trigger
      amount_high: 0, // overwritten by the compute_opportunity_amount trigger
      boba_machine_qty: opp.boba_machine_qty,
      ramen_machine_qty: opp.ramen_machine_qty,
      avg_daily_boba_units_low: opp.avg_daily_boba_units_low ?? 50,
      avg_daily_boba_units_high: opp.avg_daily_boba_units_high ?? 100,
      avg_daily_ramen_units_low: opp.avg_daily_ramen_units_low ?? 30,
      avg_daily_ramen_units_high: opp.avg_daily_ramen_units_high ?? 75,
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

/**
 * Auto-completes open follow-up tasks tied to a lead/account/contact/
 * opportunity — called whenever an action supersedes them (stage change,
 * a new interaction logged) so reps don't have to manually check off a
 * task that the action itself already fulfilled.
 */
export async function dbCompleteOpenTasksFor(filter: {
  leadId?: ID | undefined;
  accountId?: ID | undefined;
  contactId?: ID | undefined;
  opportunityId?: ID | undefined;
}): Promise<void> {
  const ids = [filter.leadId, filter.accountId, filter.contactId, filter.opportunityId].filter(
    Boolean,
  );
  if (ids.length === 0) return;

  let query = supabase.from("tasks").update({
    status: "Completed",
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  // Only touch tasks that are still Open — never resurrect a task someone
  // already cancelled.
  query = query.eq("status", "Open");

  const orParts: string[] = [];
  if (filter.leadId) orParts.push(`lead_id.eq.${filter.leadId}`);
  if (filter.accountId) orParts.push(`account_id.eq.${filter.accountId}`);
  if (filter.contactId) orParts.push(`contact_id.eq.${filter.contactId}`);
  if (filter.opportunityId) orParts.push(`opportunity_id.eq.${filter.opportunityId}`);

  const { error } = await query.or(orParts.join(","));
  if (error) throw new Error(error.message);
}

export async function dbReopenTask(taskId: ID): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ status: "Open", completed_at: null })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
}

export async function dbRescheduleTask(taskId: ID, dueDate: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ due_date: dueDate, updated_at: new Date().toISOString() })
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
