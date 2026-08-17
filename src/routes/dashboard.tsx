import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AlertTriangle, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatCard, EmptyState, DetailRow } from "@/components/crm/ui-bits";
import { LifecycleBadge, StageBadge } from "@/components/crm/badges";
import { useCrm } from "@/lib/crm/provider";
import {
  bucketTasks,
  exceptions,
  formatCurrency,
  formatShortDate,
  groupSum,
  leadName,
  openPipeline,
  pipelineByStage,
  scoreDistribution,
  sumAmount,
  userName,
  weightedAmount,
  wonRevenueByMonth,
} from "@/lib/crm/selectors";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Manager Dashboard — Yo-Kai Express Sales OS" }],
  }),
  component: DashboardPage,
});

const STAGE_COLORS: Record<string, string> = {
  Discovery: "var(--info)",
  Proposal: "var(--ember)",
  Negotiation: "var(--warning)",
  Won: "var(--success)",
  Lost: "var(--destructive)",
};

const PIE_COLORS = [
  "var(--ember)",
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "#a78bfa",
  "#34d399",
  "#f472b6",
];

export default function DashboardPage() {
  const { db } = useCrm();

  const allOpps = db.opportunities;
  const open = openPipeline(allOpps);
  const allTasks = db.tasks;
  const allLeads = db.leads;

  const exc = useMemo(
    () => exceptions(db, allOpps, allTasks, allLeads),
    [db, allOpps, allTasks, allLeads],
  );

  const buckets = useMemo(() => bucketTasks(allTasks), [allTasks]);
  const stageData = useMemo(() => pipelineByStage(open), [open]);
  const revenueByMonth = useMemo(() => wonRevenueByMonth(allOpps), [allOpps]);
  const scoreDist = useMemo(() => scoreDistribution(db.accounts), [db.accounts]);

  // Pipeline by rep
  const pipelineByRep = useMemo(() => {
    return db.users
      .filter((u) => u.role === "sales_rep")
      .map((u) => {
        const myOpen = open.filter((o) => o.owner_user_id === u.id);
        const myLeads = allLeads.filter((l) => l.owner_user_id === u.id);
        const myTasks = allTasks.filter((t) => t.owner_user_id === u.id);
        const myBuckets = bucketTasks(myTasks);
        return {
          id: u.id,
          name: u.full_name,
          region: u.region,
          openCount: myOpen.length,
          pipelineValue: sumAmount(myOpen),
          weightedValue: weightedAmount(myOpen),
          wonAmount: sumAmount(allOpps.filter((o) => o.stage === "Won" && o.owner_user_id === u.id)),
          openLeads: myLeads.filter(
            (l) => l.lifecycle_stage !== "Converted" && l.lifecycle_stage !== "Disqualified",
          ).length,
          overdueTasks: myBuckets.overdue.length,
        };
      });
  }, [db.users, open, allLeads, allTasks, allOpps]);

  // Segment breakdown
  const segmentPipeline = useMemo(
    () =>
      groupSum(
        open,
        (o) => db.accounts.find((a) => a.id === o.account_id)?.segment ?? "Unknown",
        (o) => o.amount,
      ).sort((a, b) => b.total - a.total),
    [open, db.accounts],
  );

  // Lead stage distribution
  const leadStageData = useMemo(() => {
    const stages = ["New", "MQL", "SAL", "SQL", "Converted", "Disqualified"];
    return stages.map((s) => ({
      name: s,
      count: allLeads.filter((l) => l.lifecycle_stage === s).length,
    }));
  }, [allLeads]);

  return (
    <>
      <PageHeader
        eyebrow="Manager view"
        title="Manager Dashboard"
        description="Full-funnel visibility — pipeline health, rep performance, and exception queues."
      />

      {/* Top KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total pipeline"
          value={formatCurrency(sumAmount(open))}
          hint={`${open.length} open deals`}
          tone="success"
        />
        <StatCard
          label="Weighted pipeline"
          value={formatCurrency(weightedAmount(open))}
          hint="Probability-adjusted"
        />
        <StatCard
          label="Won revenue"
          value={formatCurrency(sumAmount(allOpps.filter((o) => o.stage === "Won")))}
          tone="success"
        />
        <StatCard
          label="Active leads"
          value={
            allLeads.filter(
              (l) => l.lifecycle_stage !== "Converted" && l.lifecycle_stage !== "Disqualified",
            ).length
          }
          hint="In funnel"
        />
        <StatCard
          label="Overdue tasks"
          value={buckets.overdue.length}
          tone={buckets.overdue.length > 0 ? "danger" : "default"}
          hint="Across all reps"
        />
        <StatCard
          label="No next action"
          value={exc.noNextAction.length}
          tone={exc.noNextAction.length > 0 ? "warning" : "default"}
          hint="Open opps"
        />
      </div>

      {/* Exception queues */}
      {(exc.overdueTasks.length > 0 ||
        exc.slaBreachedLeads.length > 0 ||
        exc.unassignedLeads.length > 0 ||
        exc.pastClose.length > 0) && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {exc.slaBreachedLeads.length > 0 && (
            <Panel
              title="SLA breached leads"
              description=">48 h with no contact"
              className="ring-1 ring-warning/30 bg-warning/[0.03]"
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-border">
                {exc.slaBreachedLeads.slice(0, 4).map((l) => (
                  <li key={l.id}>
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: l.id }}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs transition-colors hover:bg-surface-muted"
                    >
                      <span className="font-medium">{leadName(l)}</span>
                      <LifecycleBadge stage={l.lifecycle_stage} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {exc.unassignedLeads.length > 0 && (
            <Panel
              title="Unassigned leads"
              description="No owner yet"
              className="ring-1 ring-destructive/20 bg-destructive/[0.03]"
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-border">
                {exc.unassignedLeads.slice(0, 4).map((l) => (
                  <li key={l.id}>
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: l.id }}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs transition-colors hover:bg-surface-muted"
                    >
                      <span className="font-medium">{leadName(l)}</span>
                      <span className="text-muted-foreground">{l.region}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {exc.pastClose.length > 0 && (
            <Panel
              title="Past close date"
              description="Open opps past expected close"
              className="ring-1 ring-destructive/20 bg-destructive/[0.03]"
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-border">
                {exc.pastClose.slice(0, 4).map((o) => (
                  <li key={o.id}>
                    <Link
                      to="/opportunities/$opportunityId"
                      params={{ opportunityId: o.id }}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs transition-colors hover:bg-surface-muted"
                    >
                      <span className="min-w-0 truncate font-medium">{o.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatShortDate(o.expected_close_date)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {exc.noNextAction.length > 0 && (
            <Panel
              title="No next action"
              description="Open opps missing next step"
              className="ring-1 ring-warning/30 bg-warning/[0.03]"
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-border">
                {exc.noNextAction.slice(0, 4).map((o) => (
                  <li key={o.id}>
                    <Link
                      to="/opportunities/$opportunityId"
                      params={{ opportunityId: o.id }}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs transition-colors hover:bg-surface-muted"
                    >
                      <span className="min-w-0 truncate font-medium">{o.name}</span>
                      <StageBadge stage={o.stage} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Left 2 cols */}
        <div className="space-y-5 xl:col-span-2">
          {/* Rep leaderboard */}
          <Panel title="Rep pipeline summary" description="All sales reps · open pipeline">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 text-left font-medium">Rep</th>
                    <th className="pb-2 text-right font-medium">Pipeline</th>
                    <th className="pb-2 text-right font-medium">Weighted</th>
                    <th className="pb-2 text-right font-medium">Won</th>
                    <th className="pb-2 text-right font-medium">Deals</th>
                    <th className="pb-2 text-right font-medium">Leads</th>
                    <th className="pb-2 text-right font-medium">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pipelineByRep.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-muted">
                      <td className="py-2.5">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.region}</p>
                      </td>
                      <td className="py-2.5 text-right font-display font-semibold tabular-nums">
                        {formatCurrency(r.pipelineValue)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(r.weightedValue)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-success">
                        {formatCurrency(r.wonAmount)}
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">{r.openCount}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{r.openLeads}</td>
                      <td
                        className={`py-2.5 text-right font-medium ${
                          r.overdueTasks > 0 ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {r.overdueTasks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Won revenue by month */}
          <Panel
            title="Won revenue by month"
            description="Closed-won deal value over time"
          >
            {revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueByMonth} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v, false), "Won revenue"]}
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="total" fill="var(--success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState>No won revenue yet.</EmptyState>
            )}
          </Panel>

          {/* Pipeline by stage bar */}
          <Panel title="Open pipeline by stage" description="Deal count and value per stage">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={stageData.filter((s) => s.stage !== "Won" && s.stage !== "Lost")}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    name === "amount" ? formatCurrency(v, false) : v,
                    name === "amount" ? "Pipeline value" : "Deals",
                  ]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {stageData
                    .filter((s) => s.stage !== "Won" && s.stage !== "Lost")
                    .map((entry) => (
                      <Cell
                        key={entry.stage}
                        fill={STAGE_COLORS[entry.stage] ?? "var(--ember)"}
                      />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Lead stage funnel */}
          <Panel title="Lead stage distribution" description="Snapshot across all leads">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={leadStageData}
                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="var(--ember)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          {/* Pipeline by segment donut */}
          <Panel title="Pipeline by segment" description="Open deal value">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={segmentPipeline}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {segmentPipeline.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v, false), "Pipeline"]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          {/* Account fit score distribution */}
          <Panel title="Account fit score" description="ICP alignment spread">
            <div className="space-y-2">
              {scoreDist.map((b) => {
                const pct = db.accounts.length ? (b.total / db.accounts.length) * 100 : 0;
                return (
                  <div key={b.name}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">{b.name}</span>
                      <span className="font-medium">{b.total}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-ember transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Quick nav to overdue tasks */}
          {buckets.overdue.length > 0 && (
            <Panel
              title="Overdue tasks"
              description={`${buckets.overdue.length} past due date`}
              className="ring-1 ring-destructive/20"
              actions={
                <Button asChild size="sm" variant="ghost">
                  <Link to="/tasks">
                    All <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              }
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-border">
                {buckets.overdue.slice(0, 5).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs"
                  >
                    <span className="min-w-0 truncate font-medium">{t.title}</span>
                    <span className="shrink-0 text-destructive">{formatShortDate(t.due_date)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
