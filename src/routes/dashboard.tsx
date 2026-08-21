import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { AlertTriangle, ArrowRight, Clipboard, Download, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Panel, StatCard, EmptyState, DetailRow } from "@/components/crm/ui-bits";
import { LifecycleBadge, StageBadge } from "@/components/crm/badges";
import { useCrm } from "@/lib/crm/provider";
import { downloadCsv } from "@/lib/crm/csv";
import { REGIONS, type Region } from "@/lib/crm/types";
import {
  bucketTasks,
  exceptions,
  formatCurrency,
  formatShortDate,
  groupSum,
  leadName,
  leadSourcePerformance,
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
  Demo: "#a78bfa",
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
  const [regionFilter, setRegionFilter] = useState<Region | "all">("all");

  // Everything below is scoped to the selected region — each record type
  // carries its own `region` field, so we filter each independently rather
  // than joining through accounts. Tasks don't carry a region directly, so
  // they're scoped via whichever account/lead/opportunity they're attached
  // to (untethered tasks are excluded from a region-specific view, since
  // there's nothing to attribute them to).
  const scopedAccounts = useMemo(
    () =>
      regionFilter === "all" ? db.accounts : db.accounts.filter((a) => a.region === regionFilter),
    [db.accounts, regionFilter],
  );
  const allOpps = useMemo(
    () =>
      regionFilter === "all"
        ? db.opportunities
        : db.opportunities.filter((o) => o.region === regionFilter),
    [db.opportunities, regionFilter],
  );
  const allLeads = useMemo(
    () => (regionFilter === "all" ? db.leads : db.leads.filter((l) => l.region === regionFilter)),
    [db.leads, regionFilter],
  );
  const allTasks = useMemo(() => {
    if (regionFilter === "all") return db.tasks;
    const accountIds = new Set(scopedAccounts.map((a) => a.id));
    const leadIds = new Set(allLeads.map((l) => l.id));
    const oppIds = new Set(allOpps.map((o) => o.id));
    return db.tasks.filter(
      (t) =>
        (t.account_id && accountIds.has(t.account_id)) ||
        (t.lead_id && leadIds.has(t.lead_id)) ||
        (t.opportunity_id && oppIds.has(t.opportunity_id)),
    );
  }, [db.tasks, regionFilter, scopedAccounts, allLeads, allOpps]);

  const open = openPipeline(allOpps);

  const exc = useMemo(
    () => exceptions(db, allOpps, allTasks, allLeads),
    [db, allOpps, allTasks, allLeads],
  );

  const buckets = useMemo(() => bucketTasks(allTasks), [allTasks]);
  const stageData = useMemo(() => pipelineByStage(open), [open]);
  const revenueByMonth = useMemo(() => wonRevenueByMonth(allOpps), [allOpps]);
  const scoreDist = useMemo(() => scoreDistribution(scopedAccounts), [scopedAccounts]);

  // Pipeline by rep — scoped to the region filter by the rep's home region
  const pipelineByRep = useMemo(() => {
    return db.users
      .filter(
        (u) => u.role === "sales_rep" && (regionFilter === "all" || u.region === regionFilter),
      )
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
          wonAmount: sumAmount(
            allOpps.filter((o) => o.stage === "Won" && o.owner_user_id === u.id),
          ),
          openLeads: myLeads.filter(
            (l) => l.lifecycle_stage !== "Converted" && l.lifecycle_stage !== "Disqualified",
          ).length,
          overdueTasks: myBuckets.overdue.length,
        };
      });
  }, [db.users, regionFilter, open, allLeads, allTasks, allOpps]);

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

  const sourcePerf = useMemo(() => leadSourcePerformance(db, allLeads), [db, allLeads]);
  const convertedCount = allLeads.filter((l) => l.lifecycle_stage === "Converted").length;
  const conversionRate = allLeads.length ? convertedCount / allLeads.length : 0;

  // Weekly summary — auto-generated fresh each time this page loads,
  // trailing 7 days from now. No email/cron backend yet, so this is the
  // report surface for management; "Copy" formats it for pasting into
  // email/Slack, "Export CSV" opens directly in Excel/Sheets.
  const weeklySummary = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceIso = since.toISOString();
    const now = new Date().toISOString();

    const newLeads = allLeads.filter((l) => l.created_at >= sinceIso);
    const convertedThisWeek = allLeads.filter((l) => l.converted_at && l.converted_at >= sinceIso);
    const newOppsThisWeek = allOpps.filter((o) => o.created_at >= sinceIso);
    const wonThisWeek = allOpps.filter(
      (o) => o.stage === "Won" && o.closed_at && o.closed_at >= sinceIso,
    );
    const lostThisWeek = allOpps.filter(
      (o) => o.stage === "Lost" && o.closed_at && o.closed_at >= sinceIso,
    );

    return {
      periodLabel: `${formatShortDate(sinceIso)} – ${formatShortDate(now)}`,
      newLeadsCount: newLeads.length,
      convertedCount: convertedThisWeek.length,
      newOppsCount: newOppsThisWeek.length,
      newPipelineValue: sumAmount(newOppsThisWeek),
      wonCount: wonThisWeek.length,
      wonValue: sumAmount(wonThisWeek),
      lostCount: lostThisWeek.length,
      overdueTasks: buckets.overdue.length,
    };
  }, [allLeads, allOpps, buckets]);

  const weeklySummaryText = [
    `YKE Weekly Sales Summary — ${weeklySummary.periodLabel}`,
    `New leads: ${weeklySummary.newLeadsCount}`,
    `Leads converted to accounts: ${weeklySummary.convertedCount}`,
    `New opportunities: ${weeklySummary.newOppsCount} (${formatCurrency(weeklySummary.newPipelineValue)} added to pipeline)`,
    `Won: ${weeklySummary.wonCount} deals (${formatCurrency(weeklySummary.wonValue)})`,
    `Lost: ${weeklySummary.lostCount} deals`,
    `Overdue follow-up tasks: ${weeklySummary.overdueTasks}`,
    `Total open pipeline: ${formatCurrency(sumAmount(open))} (${formatCurrency(weightedAmount(open))} weighted)`,
  ].join("\n");

  return (
    <>
      <PageHeader
        eyebrow="Manager view"
        title="Manager Dashboard"
        description="Full-funnel visibility — pipeline health, rep performance, and exception queues."
        actions={
          <Select value={regionFilter} onValueChange={(v) => setRegionFilter(v as Region | "all")}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {REGIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Weekly summary report */}
      <Panel
        title="Weekly summary"
        description={`Auto-generated · ${weeklySummary.periodLabel}`}
        className="mb-5"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(weeklySummaryText);
                toast.success("Copied weekly summary", {
                  description: "Paste it into an email or Slack message.",
                });
              }}
            >
              <Clipboard className="size-3.5" /> Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(`weekly-summary-${new Date().toISOString().slice(0, 10)}.csv`, [
                  {
                    period: weeklySummary.periodLabel,
                    new_leads: weeklySummary.newLeadsCount,
                    converted: weeklySummary.convertedCount,
                    new_opportunities: weeklySummary.newOppsCount,
                    new_pipeline_value: weeklySummary.newPipelineValue,
                    won_deals: weeklySummary.wonCount,
                    won_value: weeklySummary.wonValue,
                    lost_deals: weeklySummary.lostCount,
                    overdue_tasks: weeklySummary.overdueTasks,
                  },
                ])
              }
            >
              <Download className="size-3.5" /> Export CSV
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <StatCard label="New leads" value={weeklySummary.newLeadsCount} />
          <StatCard label="Converted" value={weeklySummary.convertedCount} tone="brand" />
          <StatCard
            label="New opps"
            value={weeklySummary.newOppsCount}
            hint={formatCurrency(weeklySummary.newPipelineValue)}
          />
          <StatCard
            label="Won"
            value={weeklySummary.wonCount}
            hint={formatCurrency(weeklySummary.wonValue)}
            tone="success"
          />
          <StatCard label="Lost" value={weeklySummary.lostCount} tone="danger" />
          <StatCard
            label="Overdue tasks"
            value={weeklySummary.overdueTasks}
            tone={weeklySummary.overdueTasks > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Total open pipeline"
            value={formatCurrency(sumAmount(open))}
            tone="success"
          />
        </div>
      </Panel>

      {/* Top KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
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
        <StatCard
          label="Conversion rate"
          value={`${(conversionRate * 100).toFixed(1)}%`}
          hint={`${convertedCount} of ${allLeads.length} leads`}
          tone="brand"
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

          {/* Leads by source */}
          <Panel title="Leads by source" description="Volume and funnel conversion per channel">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 text-left font-medium">Source</th>
                    <th className="pb-2 text-right font-medium">Leads</th>
                    <th className="pb-2 text-right font-medium">MQL</th>
                    <th className="pb-2 text-right font-medium">SQL</th>
                    <th className="pb-2 text-right font-medium">Converted</th>
                    <th className="pb-2 text-right font-medium">Conv. rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sourcePerf.map((s) => (
                    <tr key={s.source} className="hover:bg-surface-muted">
                      <td className="py-2.5 font-medium">{s.source}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{s.volume}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{s.mql}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{s.sql}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{s.converted}</td>
                      <td className="py-2.5 text-right font-medium tabular-nums">
                        {(s.convRate * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Won revenue by month */}
          <Panel title="Won revenue by month" description="Closed-won deal value over time">
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
                      <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? "var(--ember)"} />
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
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          {/* Account fit score distribution */}
          <Panel title="Account fit score" description="ICP alignment spread">
            <div className="space-y-2">
              {scoreDist.map((b) => {
                const pct = scopedAccounts.length ? (b.total / scopedAccounts.length) * 100 : 0;
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
