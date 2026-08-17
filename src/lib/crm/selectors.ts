/**
 * Pure derived-data helpers. All of these take the database snapshot as an
 * argument so they can later run against Supabase results (or be replaced by
 * SQL views) unchanged.
 */
import type {
  Account,
  Contact,
  CrmDatabase,
  ID,
  Interaction,
  Lead,
  LeadLifecycleStage,
  Opportunity,
  OpportunityStage,
  Task,
  User,
} from "./types";

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export function byId<T extends { id: ID }>(rows: T[], id?: ID | null): T | undefined {
  if (!id) return undefined;
  return rows.find((r) => r.id === id);
}

export const userName = (db: CrmDatabase, id?: ID | null): string =>
  byId(db.users, id)?.full_name ?? "Unassigned";

export const accountName = (db: CrmDatabase, id?: ID | null): string =>
  byId(db.accounts, id)?.name ?? "—";

export const contactName = (db: CrmDatabase, id?: ID | null): string => {
  const c = byId(db.contacts, id);
  return c ? `${c.first_name} ${c.last_name}` : "—";
};

export const leadName = (lead: Lead): string => `${lead.first_name} ${lead.last_name}`;

/** Rows a given user is allowed to focus on, based on role. */
export function scopeForUser<T extends { owner_user_id?: ID | null }>(rows: T[], user: User): T[] {
  if (user.role === "sales_rep") return rows.filter((r) => r.owner_user_id === user.id);
  return rows;
}

export interface TaskBuckets {
  overdue: Task[];
  dueToday: Task[];
  upcoming: Task[];
  completed: Task[];
}

export function bucketTasks(tasks: Task[]): TaskBuckets {
  const t = todayIso();
  const open = tasks.filter((x) => x.status === "Open");
  return {
    overdue: open.filter((x) => x.due_date < t).sort((a, b) => a.due_date.localeCompare(b.due_date)),
    dueToday: open.filter((x) => x.due_date === t),
    upcoming: open.filter((x) => x.due_date > t).sort((a, b) => a.due_date.localeCompare(b.due_date)),
    completed: tasks.filter((x) => x.status === "Completed"),
  };
}

export const openPipeline = (opps: Opportunity[]): Opportunity[] =>
  opps.filter((o) => o.stage !== "Won" && o.stage !== "Lost");

export const sumAmount = (opps: Opportunity[]): number =>
  opps.reduce((acc, o) => acc + o.amount, 0);

export const weightedAmount = (opps: Opportunity[]): number =>
  opps.reduce((acc, o) => acc + (o.amount * o.probability) / 100, 0);

export function funnelCounts(db: CrmDatabase, leads: Lead[]) {
  const reached = (stage: LeadLifecycleStage) =>
    leads.filter((l) => l.lifecycle_history.some((h) => h.stage === stage)).length;
  const opportunityCount = db.opportunities.filter((o) =>
    leads.some((l) => l.converted_opportunity_id === o.id || o.originating_lead_id === l.id),
  ).length;
  return {
    total: leads.length,
    mql: reached("MQL"),
    sal: reached("SAL"),
    sql: reached("SQL"),
    converted: reached("Converted"),
    opportunities: Math.max(opportunityCount, reached("Converted")),
    won: db.opportunities.filter((o) => o.stage === "Won").length,
  };
}

export function leadSourcePerformance(db: CrmDatabase, leads: Lead[]) {
  const groups = new Map<string, Lead[]>();
  leads.forEach((l) => {
    const arr = groups.get(l.source) ?? [];
    arr.push(l);
    groups.set(l.source, arr);
  });
  return Array.from(groups.entries())
    .map(([source, rows]) => {
      const reached = (stage: LeadLifecycleStage) =>
        rows.filter((l) => l.lifecycle_history.some((h) => h.stage === stage)).length;
      const mql = reached("MQL");
      const sql = reached("SQL");
      const converted = reached("Converted");
      const wonRevenue = db.opportunities
        .filter((o) => o.stage === "Won" && rows.some((l) => l.converted_opportunity_id === o.id))
        .reduce((a, o) => a + o.amount, 0);
      return {
        source,
        volume: rows.length,
        mql,
        sql,
        converted,
        mqlRate: rows.length ? mql / rows.length : 0,
        sqlRate: mql ? sql / mql : 0,
        convRate: sql ? converted / sql : 0,
        wonRevenue,
      };
    })
    .sort((a, b) => b.volume - a.volume);
}

export function pipelineByStage(opps: Opportunity[]) {
  const stages: OpportunityStage[] = ["Discovery", "Proposal", "Negotiation", "Won", "Lost"];
  return stages.map((stage) => {
    const rows = opps.filter((o) => o.stage === stage);
    return { stage, count: rows.length, amount: sumAmount(rows) };
  });
}

export function groupSum<T>(rows: T[], key: (r: T) => string, value: (r: T) => number) {
  const map = new Map<string, number>();
  rows.forEach((r) => map.set(key(r), (map.get(key(r)) ?? 0) + value(r)));
  return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
}

export function scoreDistribution(accounts: Account[]) {
  const buckets = [
    { name: "0–49", min: 0, max: 49 },
    { name: "50–64", min: 50, max: 64 },
    { name: "65–79", min: 65, max: 79 },
    { name: "80–89", min: 80, max: 89 },
    { name: "90–100", min: 90, max: 100 },
  ];
  return buckets.map((b) => ({
    name: b.name,
    total: accounts.filter((a) => a.account_fit_score >= b.min && a.account_fit_score <= b.max).length,
  }));
}

export function wonRevenueByMonth(opps: Opportunity[]) {
  const map = new Map<string, number>();
  opps
    .filter((o) => o.stage === "Won" && o.closed_at)
    .forEach((o) => {
      const key = o.closed_at!.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + o.amount);
    });
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ name: month, total }));
}

/** Exception queues for the manager dashboard. */
export function exceptions(db: CrmDatabase, opps: Opportunity[], tasks: Task[], leads: Lead[]) {
  const t = todayIso();
  const open = openPipeline(opps);
  return {
    overdueTasks: tasks.filter((x) => x.status === "Open" && x.due_date < t),
    slaBreachedLeads: leads.filter(
      (l) =>
        !l.last_contacted_at &&
        l.lifecycle_stage !== "Converted" &&
        l.lifecycle_stage !== "Disqualified" &&
        Date.now() - new Date(l.created_at).getTime() > 2 * 24 * 3600 * 1000,
    ),
    noNextAction: open.filter((o) => !o.next_action),
    pastClose: open.filter((o) => o.expected_close_date < t),
    unassignedLeads: leads.filter((l) => !l.owner_user_id && l.lifecycle_stage !== "Converted"),
    unusedAccounts: db.accounts.length,
  };
}

export interface SearchHit {
  kind: "Account" | "Contact" | "Lead" | "Opportunity";
  id: ID;
  title: string;
  subtitle: string;
  to: string;
  params?: Record<string, string>;
}

export function globalSearch(db: CrmDatabase, query: string, limit = 8): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];

  db.accounts
    .filter((a) => a.name.toLowerCase().includes(q) || (a.domain ?? "").toLowerCase().includes(q))
    .slice(0, limit)
    .forEach((a: Account) =>
      hits.push({
        kind: "Account",
        id: a.id,
        title: a.name,
        subtitle: `${a.segment} · ${a.region} · Fit ${a.account_fit_score}`,
        to: "/accounts/$accountId",
        params: { accountId: a.id },
      }),
    );

  db.contacts
    .filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    )
    .slice(0, limit)
    .forEach((c: Contact) =>
      hits.push({
        kind: "Contact",
        id: c.id,
        title: `${c.first_name} ${c.last_name}`,
        subtitle: `${c.title ?? "Contact"} · ${accountName(db, c.account_id)}`,
        to: "/accounts/$accountId",
        params: { accountId: c.account_id },
      }),
    );

  db.leads
    .filter(
      (l) =>
        leadName(l).toLowerCase().includes(q) ||
        l.company_name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q),
    )
    .slice(0, limit)
    .forEach((l: Lead) =>
      hits.push({
        kind: "Lead",
        id: l.id,
        title: `${leadName(l)} — ${l.company_name}`,
        subtitle: `${l.lifecycle_stage} · ${l.source}`,
        to: "/leads/$leadId",
        params: { leadId: l.id },
      }),
    );

  db.opportunities
    .filter((o) => o.name.toLowerCase().includes(q))
    .slice(0, limit)
    .forEach((o: Opportunity) =>
      hits.push({
        kind: "Opportunity",
        id: o.id,
        title: o.name,
        subtitle: `${o.stage} · ${formatCurrency(o.amount)}`,
        to: "/opportunities/$opportunityId",
        params: { opportunityId: o.id },
      }),
    );

  return hits;
}

export function relatedInteractions(
  interactions: Interaction[],
  match: { accountId?: ID; contactId?: ID; leadId?: ID; opportunityId?: ID },
): Interaction[] {
  return interactions
    .filter(
      (i) =>
        (match.accountId && i.account_id === match.accountId) ||
        (match.contactId && i.contact_id === match.contactId) ||
        (match.leadId && i.lead_id === match.leadId) ||
        (match.opportunityId && i.opportunity_id === match.opportunityId),
    )
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

export function relatedTasks(
  tasks: Task[],
  match: { accountId?: ID; contactId?: ID; leadId?: ID; opportunityId?: ID },
): Task[] {
  return tasks
    .filter(
      (t) =>
        (match.accountId && t.account_id === match.accountId) ||
        (match.contactId && t.contact_id === match.contactId) ||
        (match.leadId && t.lead_id === match.leadId) ||
        (match.opportunityId && t.opportunity_id === match.opportunityId),
    )
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export function formatCurrency(value: number, compact = true): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact && Math.abs(value) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function formatShortDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function relativeDay(iso?: string | null): string {
  if (!iso) return "—";
  const t = todayIso();
  if (iso.slice(0, 10) === t) return "Today";
  const diff = Math.round(
    (new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime() - new Date(`${t}T00:00:00Z`).getTime()) /
      86400000,
  );
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return `in ${diff}d`;
}
