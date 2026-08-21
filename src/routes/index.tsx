import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Flame,
  LineChart,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatCard, EmptyState } from "@/components/crm/ui-bits";
import { TaskList } from "@/components/crm/TaskList";
import { InteractionTimeline } from "@/components/crm/InteractionTimeline";
import { FitScore, LeadScore, LifecycleBadge, StageBadge } from "@/components/crm/badges";
import { useCrm } from "@/lib/crm/provider";
import {
  bucketTasks,
  exceptions,
  formatCurrency,
  formatShortDate,
  funnelCounts,
  leadName,
  openPipeline,
  relativeDay,
  scopeForUser,
  sumAmount,
  weightedAmount,
  accountName,
} from "@/lib/crm/selectors";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sales Home — Yo-Kai Express Sales OS" },
      {
        name: "description",
        content:
          "Your daily YKE sales workspace: overdue follow-ups, today's tasks, new leads and live pipeline.",
      },
      { property: "og:title", content: "Sales Home — Yo-Kai Express Sales OS" },
      {
        property: "og:description",
        content: "What do I need to do today? Follow-ups, new leads and pipeline in one screen.",
      },
    ],
  }),
  component: SalesHome,
});

function SalesHome() {
  const { currentUser } = useCrm();
  return currentUser.role === "sales_rep" ? <SalesRepHome /> : <ManagerHome />;
}

function SalesRepHome() {
  const { db, currentUser } = useCrm();

  const myTasks = scopeForUser(db.tasks, currentUser);
  const buckets = bucketTasks(myTasks);
  const myLeads = scopeForUser(db.leads, currentUser);
  const myAccounts = scopeForUser(db.accounts, currentUser);
  const myOpps = scopeForUser(db.opportunities, currentUser);
  const open = openPipeline(myOpps);

  const newLeads = myLeads.filter((l) => l.lifecycle_stage === "New");
  const highPriority = myLeads
    .filter(
      (l) =>
        l.lifecycle_stage !== "Converted" &&
        l.lifecycle_stage !== "Disqualified" &&
        l.lead_score >= 70,
    )
    .sort((a, b) => b.lead_score - a.lead_score);
  const unassigned = db.leads.filter((l) => !l.owner_user_id && l.lifecycle_stage === "New");

  const recentInteractions = db.interactions
    .filter((i) => i.owner_user_id === currentUser.id)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, 6);

  const hour = new Date().getUTCHours();
  const greeting = hour < 11 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        eyebrow={`${currentUser.region} · ${currentUser.role.replace("_", " ")}`}
        title={`${greeting}, ${currentUser.full_name.split(" ")[0]}`}
        description="Here is what needs you today — ordered by what moves revenue first."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/leads">Work my leads</Link>
            </Button>
            <Button asChild>
              <Link to="/leads/new">New lead</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Overdue"
          value={buckets.overdue.length}
          hint="Follow-ups past due"
          tone={buckets.overdue.length ? "danger" : "default"}
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          label="Due today"
          value={buckets.dueToday.length}
          hint="Clear these before EOD"
          tone="warning"
          icon={<CalendarClock className="size-4" />}
        />
        <StatCard
          label="New leads"
          value={newLeads.length}
          hint="Awaiting qualification"
          icon={<Target className="size-4" />}
        />
        <StatCard
          label="High priority"
          value={highPriority.length}
          hint="Lead score 70+"
          tone="brand"
          icon={<Flame className="size-4" />}
        />
        <StatCard
          label="My pipeline"
          value={formatCurrency(sumAmount(open))}
          hint={`${formatCurrency(weightedAmount(open))} weighted · ${open.length} open`}
          tone="success"
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Panel
            title="Overdue follow-ups"
            description="Oldest first — these are commitments already missed."
            bodyClassName="p-4 pt-1"
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link to="/tasks">
                  All follow-ups <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            <TaskList
              tasks={buckets.overdue.slice(0, 6)}
              emptyLabel="Nothing overdue. Strong work."
            />
          </Panel>

          <Panel title="Due today" bodyClassName="p-4 pt-1">
            <TaskList tasks={buckets.dueToday} emptyLabel="No tasks due today." />
          </Panel>

          <Panel title="Upcoming" description="Next 7 days" bodyClassName="p-4 pt-1">
            <TaskList
              tasks={buckets.upcoming.slice(0, 6)}
              dense
              emptyLabel="Nothing scheduled — consider booking next steps."
            />
          </Panel>

          <Panel
            title="My opportunities"
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link to="/opportunities">
                  Pipeline <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
            bodyClassName="p-0"
          >
            {open.length ? (
              <ul className="divide-y divide-border">
                {open
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 6)
                  .map((o) => (
                    <li key={o.id}>
                      <Link
                        to="/opportunities/$opportunityId"
                        params={{ opportunityId: o.id }}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{o.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {accountName(db, o.account_id)} · {o.next_action ?? "No next action"}
                          </p>
                        </div>
                        <StageBadge stage={o.stage} />
                        <div className="w-20 text-right">
                          <p className="font-display text-sm font-semibold">
                            {formatCurrency(o.amount)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatShortDate(o.expected_close_date)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="p-4">
                <EmptyState>
                  No open opportunities yet — convert a qualified lead to start one.
                </EmptyState>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            title="New leads"
            description="Not yet qualified"
            bodyClassName="p-0"
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link to="/leads">
                  All leads <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            {newLeads.length ? (
              <ul className="divide-y divide-border">
                {newLeads.slice(0, 5).map((l) => (
                  <li key={l.id}>
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: l.id }}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{leadName(l)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {l.company_name} · {l.source}
                        </p>
                      </div>
                      <LeadScore value={l.lead_score} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4">
                <EmptyState>No new leads in your queue.</EmptyState>
              </div>
            )}
          </Panel>

          <Panel title="High priority leads" description="Lead score 70+" bodyClassName="p-0">
            {highPriority.length ? (
              <ul className="divide-y divide-border">
                {highPriority.slice(0, 5).map((l) => (
                  <li key={l.id}>
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: l.id }}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{leadName(l)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {l.company_name} · last touch {relativeDay(l.last_contacted_at)}
                        </p>
                      </div>
                      <LifecycleBadge stage={l.lifecycle_stage} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4">
                <EmptyState>No high-scoring leads right now.</EmptyState>
              </div>
            )}
          </Panel>

          {unassigned.length ? (
            <Panel title="Unassigned leads" description="Nobody owns these yet" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {unassigned.slice(0, 4).map((l) => (
                  <li key={l.id}>
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: l.id }}
                      className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-muted"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {leadName(l)} — {l.company_name}
                      </span>
                      <span className="text-xs text-muted-foreground">{l.region}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel
            title="My accounts"
            description="By Account Fit Score"
            bodyClassName="p-0"
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link to="/accounts">
                  All accounts <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            {myAccounts.length ? (
              <ul className="divide-y divide-border">
                {[...myAccounts]
                  .sort((a, b) => b.account_fit_score - a.account_fit_score)
                  .slice(0, 5)
                  .map((a) => (
                    <li key={a.id}>
                      <Link
                        to="/accounts/$accountId"
                        params={{ accountId: a.id }}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-muted"
                      >
                        <FitScore value={a.account_fit_score} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{a.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.segment} · {a.region}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="p-4">
                <EmptyState>No accounts assigned to you yet.</EmptyState>
              </div>
            )}
          </Panel>

          <Panel
            title="Recent activity"
            description="Your latest logged interactions"
            actions={<Sparkles className="size-4 text-ember" />}
          >
            <InteractionTimeline
              interactions={recentInteractions}
              emptyLabel="You haven't logged anything yet."
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

interface QuickLink {
  to: string;
  label: string;
  value: string;
  hint: string;
  icon: typeof Target;
}

function ManagerHome() {
  const { db, currentUser } = useCrm();

  const open = openPipeline(db.opportunities);
  const funnel = funnelCounts(db, db.leads);
  const exc = exceptions(db, db.opportunities, db.tasks, db.leads);
  const repCount = db.users.filter((u) => u.role === "sales_rep" && u.active).length;
  const wonRevenue = sumAmount(db.opportunities.filter((o) => o.stage === "Won"));

  const hour = new Date().getUTCHours();
  const greeting = hour < 11 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const quickLinks: QuickLink[] = [
    {
      to: "/leads",
      label: "All Leads",
      value: String(db.leads.length),
      hint: `${funnel.sql} in SQL`,
      icon: Target,
    },
    {
      to: "/opportunities",
      label: "All Pipeline",
      value: formatCurrency(sumAmount(open)),
      hint: `${open.length} open deals`,
      icon: BarChart3,
    },
    {
      to: "/dashboard",
      label: "Team Performance",
      value: String(repCount),
      hint: "active reps",
      icon: Users,
    },
    {
      to: "/dashboard",
      label: "Reports",
      value: "Charts",
      hint: "Funnel, pipeline & revenue",
      icon: LineChart,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={`${currentUser.region} · ${currentUser.role.replace("_", " ")}`}
        title={`${greeting}, ${currentUser.full_name.split(" ")[0]}`}
        description="Org-wide snapshot — jump into any view below."
        actions={
          <Button asChild>
            <Link to="/dashboard">
              Open full dashboard <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {quickLinks.map((q) => (
          <Link
            key={q.label}
            to={q.to}
            className="panel flex flex-col gap-2 p-4 transition-colors hover:border-ring/40"
          >
            <q.icon className="size-4 text-muted-foreground" />
            <div>
              <p className="metric-value">{q.value}</p>
              <p className="text-xs font-medium">{q.label}</p>
              <p className="text-[11px] text-muted-foreground">{q.hint}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Total pipeline" value={formatCurrency(sumAmount(open))} tone="success" />
        <StatCard label="Won revenue" value={formatCurrency(wonRevenue)} tone="success" />
        <StatCard label="Open opps" value={open.length} />
        <StatCard label="MQL" value={funnel.mql} />
        <StatCard label="SQL" value={funnel.sql} tone="brand" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel
          title="SLA breached leads"
          description="No contact in 48h+"
          bodyClassName="p-0"
          className={exc.slaBreachedLeads.length ? "ring-1 ring-warning/30" : ""}
        >
          {exc.slaBreachedLeads.length ? (
            <ul className="divide-y divide-border">
              {exc.slaBreachedLeads.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <Link
                    to="/leads/$leadId"
                    params={{ leadId: l.id }}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-surface-muted"
                  >
                    <span className="min-w-0 truncate font-medium">{leadName(l)}</span>
                    <LifecycleBadge stage={l.lifecycle_stage} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <EmptyState>Nothing overdue for contact.</EmptyState>
            </div>
          )}
        </Panel>

        <Panel
          title="Unassigned leads"
          description="No owner yet"
          bodyClassName="p-0"
          className={exc.unassignedLeads.length ? "ring-1 ring-destructive/20" : ""}
        >
          {exc.unassignedLeads.length ? (
            <ul className="divide-y divide-border">
              {exc.unassignedLeads.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <Link
                    to="/leads/$leadId"
                    params={{ leadId: l.id }}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-surface-muted"
                  >
                    <span className="min-w-0 truncate font-medium">{leadName(l)}</span>
                    <span className="text-xs text-muted-foreground">{l.region}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <EmptyState>Every lead has an owner.</EmptyState>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
