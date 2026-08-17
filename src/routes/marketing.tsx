import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from "recharts";
import { PageHeader, Panel, StatCard, DetailRow, EmptyState } from "@/components/crm/ui-bits";
import { useCrm } from "@/lib/crm/provider";
import {
  formatCurrency,
  formatDate,
  funnelCounts,
  leadSourcePerformance,
  scopeForUser,
} from "@/lib/crm/selectors";
import type { Region } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/marketing")({
  head: () => ({
    meta: [{ title: "Marketing Funnel — Yo-Kai Express Sales OS" }],
  }),
  component: MarketingPage,
});

const FUNNEL_COLORS = [
  "var(--info)",
  "var(--ember)",
  "var(--warning)",
  "var(--success)",
  "var(--success)",
  "#a78bfa",
  "#34d399",
];

function pct(num: number, denom: number) {
  if (!denom) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

function MarketingPage() {
  const { db } = useCrm();
  const [region, setRegion] = useState<Region | "all">("all");

  const leads = useMemo(
    () => (region === "all" ? db.leads : db.leads.filter((l) => l.region === region)),
    [db.leads, region],
  );

  const funnel = useMemo(() => funnelCounts(db, leads), [db, leads]);
  const sourcePerf = useMemo(() => leadSourcePerformance(db, leads), [db, leads]);

  const funnelChartData = [
    { name: "Total leads", value: funnel.total, fill: "var(--info)" },
    { name: "MQL", value: funnel.mql, fill: "var(--ember)" },
    { name: "SAL", value: funnel.sal, fill: "var(--warning)" },
    { name: "SQL", value: funnel.sql, fill: "#a78bfa" },
    { name: "Converted", value: funnel.converted, fill: "var(--success)" },
    { name: "Opportunity", value: funnel.opportunities, fill: "var(--success)" },
  ];

  // Campaign ROI table
  const campaigns = useMemo(() => {
    return db.campaigns.map((c) => {
      const campaignLeads = leads.filter((l) => l.campaign_id === c.id);
      const converted = campaignLeads.filter((l) => l.lifecycle_stage === "Converted").length;
      const wonOpps = db.opportunities.filter(
        (o) =>
          o.stage === "Won" &&
          campaignLeads.some((l) => l.converted_opportunity_id === o.id),
      );
      const wonRevenue = wonOpps.reduce((a, o) => a + o.amount, 0);
      const roi = c.budget && c.budget > 0 ? ((wonRevenue - c.budget) / c.budget) * 100 : null;
      return {
        ...c,
        leads: campaignLeads.length,
        converted,
        convRate: campaignLeads.length ? converted / campaignLeads.length : 0,
        wonRevenue,
        roi,
      };
    });
  }, [db.campaigns, db.opportunities, leads]);

  // Source performance bar chart data
  const sourceBarData = sourcePerf.slice(0, 8).map((s) => ({
    name: s.source.length > 18 ? s.source.slice(0, 16) + "…" : s.source,
    fullName: s.source,
    leads: s.volume,
    mql: s.mql,
    sql: s.sql,
    converted: s.converted,
  }));

  // Conversion rate bar
  const convRateData = sourcePerf
    .filter((s) => s.volume >= 2)
    .map((s) => ({
      name: s.source.length > 18 ? s.source.slice(0, 16) + "…" : s.source,
      rate: Math.round(s.mqlRate * 100),
    }))
    .sort((a, b) => b.rate - a.rate);

  return (
    <>
      <PageHeader
        eyebrow="Marketing intelligence"
        title="Marketing Funnel"
        description="Lead-to-revenue funnel, source performance and campaign ROI in one view."
      />

      {/* Region toggle */}
      <div className="mb-5 flex gap-2">
        {(["all", "US", "Asia"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              region === r
                ? "border-ember bg-ember/10 font-medium text-ember"
                : "border-border hover:bg-surface-muted text-muted-foreground",
            )}
          >
            {r === "all" ? "Global" : r}
          </button>
        ))}
      </div>

      {/* Funnel KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total leads" value={funnel.total} />
        <StatCard
          label="MQL"
          value={funnel.mql}
          hint={`${pct(funnel.mql, funnel.total)} of leads`}
          tone="brand"
        />
        <StatCard
          label="SAL"
          value={funnel.sal}
          hint={`${pct(funnel.sal, funnel.mql)} of MQL`}
        />
        <StatCard
          label="SQL"
          value={funnel.sql}
          hint={`${pct(funnel.sql, funnel.sal)} of SAL`}
        />
        <StatCard
          label="Converted"
          value={funnel.converted}
          hint={`${pct(funnel.converted, funnel.sql)} of SQL`}
          tone="success"
        />
        <StatCard
          label="Opportunities"
          value={funnel.opportunities}
          hint={`${pct(funnel.opportunities, funnel.converted)} conversion`}
          tone="success"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Left 2 cols */}
        <div className="space-y-5 xl:col-span-2">
          {/* Source volume bar */}
          <Panel
            title="Lead volume by source"
            description="How many leads each channel generates"
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sourceBarData} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
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
                <Bar dataKey="leads" name="Leads" fill="var(--info)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mql" name="MQL" fill="var(--ember)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" name="Converted" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          {/* MQL conversion rate by source */}
          <Panel
            title="MQL rate by source"
            description="% of leads that reach MQL — higher is better"
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={convRateData}
                margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
              >
                <XAxis
                  type="number"
                  unit="%"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "MQL rate"]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="rate" fill="var(--ember)" radius={[0, 4, 4, 0]}>
                  {convRateData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        convRateData[i]!.rate >= 50
                          ? "var(--success)"
                          : convRateData[i]!.rate >= 25
                            ? "var(--ember)"
                            : "var(--muted-foreground)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          {/* Campaign ROI table */}
          <Panel title="Campaign performance" description="Lead volume, conversion and ROI per campaign">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2.5 text-left font-medium">Campaign</th>
                    <th className="pb-2.5 text-left font-medium">Channel</th>
                    <th className="pb-2.5 text-right font-medium">Leads</th>
                    <th className="pb-2.5 text-right font-medium">Converted</th>
                    <th className="pb-2.5 text-right font-medium">Conv %</th>
                    <th className="pb-2.5 text-right font-medium">Won rev</th>
                    <th className="pb-2.5 text-right font-medium">Budget</th>
                    <th className="pb-2.5 text-right font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-muted">
                      <td className="py-2.5">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.region}</p>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{c.channel}</td>
                      <td className="py-2.5 text-right tabular-nums">{c.leads}</td>
                      <td className="py-2.5 text-right tabular-nums">{c.converted}</td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        {Math.round(c.convRate * 100)}%
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-success">
                        {c.wonRevenue > 0 ? formatCurrency(c.wonRevenue) : "—"}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        {c.budget ? formatCurrency(c.budget) : "—"}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {c.roi !== null ? (
                          <span className={c.roi >= 0 ? "text-success" : "text-destructive"}>
                            {c.roi >= 0 ? "+" : ""}
                            {Math.round(c.roi)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Funnel chart */}
          <Panel title="Conversion funnel" description="Lead → Opportunity">
            <div className="space-y-1.5">
              {funnelChartData.map((stage, idx) => {
                const pctOfFirst =
                  funnelChartData[0]!.value > 0
                    ? (stage.value / funnelChartData[0]!.value) * 100
                    : 0;
                const dropFromPrev =
                  idx > 0 && funnelChartData[idx - 1]!.value > 0
                    ? ((funnelChartData[idx - 1]!.value - stage.value) / funnelChartData[idx - 1]!.value) * 100
                    : 0;
                return (
                  <div key={stage.name}>
                    {idx > 0 && dropFromPrev > 0 && (
                      <div className="flex justify-end py-0.5 pr-1 text-[10px] text-muted-foreground">
                        ↓ {Math.round(dropFromPrev)}% drop
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                        {stage.name}
                      </span>
                      <div className="flex-1 rounded-full bg-surface-muted" style={{ height: 20 }}>
                        <div
                          className="flex h-full items-center justify-end rounded-full pr-2 text-[11px] font-semibold text-white transition-all"
                          style={{
                            width: `${Math.max(pctOfFirst, 4)}%`,
                            backgroundColor: stage.fill,
                          }}
                        >
                          {stage.value}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Source detail table */}
          <Panel title="Source breakdown" description="Detailed conversion metrics">
            <div className="space-y-3">
              {sourcePerf.slice(0, 6).map((s) => (
                <div key={s.source} className="rounded-lg border border-border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold">{s.source}</p>
                    <span className="text-xs text-muted-foreground">{s.volume} leads</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <p className="font-display text-sm font-semibold">{s.mql}</p>
                      <p className="text-[10px] text-muted-foreground">MQL</p>
                    </div>
                    <div>
                      <p className="font-display text-sm font-semibold">{s.sql}</p>
                      <p className="text-[10px] text-muted-foreground">SQL</p>
                    </div>
                    <div>
                      <p className="font-display text-sm font-semibold text-success">{s.converted}</p>
                      <p className="text-[10px] text-muted-foreground">Conv.</p>
                    </div>
                  </div>
                  {s.wonRevenue > 0 && (
                    <p className="mt-1.5 text-center text-xs text-success">
                      {formatCurrency(s.wonRevenue)} won
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {/* Active campaigns */}
          <Panel title="Active campaigns" bodyClassName="p-0">
            {db.campaigns.filter((c) => c.is_active).length ? (
              <ul className="divide-y divide-border">
                {db.campaigns
                  .filter((c) => c.is_active)
                  .map((c) => (
                    <li key={c.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{c.name}</p>
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                          Active
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.channel} · {c.region}
                        {c.budget ? ` · ${formatCurrency(c.budget)} budget` : ""}
                      </p>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="p-4">
                <EmptyState>No active campaigns.</EmptyState>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
