import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Panel, EmptyState, StatCard } from "@/components/crm/ui-bits";
import { StageBadge } from "@/components/crm/badges";
import { useCrm } from "@/lib/crm/provider";
import {
  accountName,
  formatCurrency,
  formatShortDate,
  openPipeline,
  pipelineByStage,
  sumAmount,
  userName,
  weightedAmount,
} from "@/lib/crm/selectors";
import { OPPORTUNITY_STAGES, type OpportunityStage, type Region } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/opportunities/")({
  head: () => ({
    meta: [{ title: "Opportunities — Yo-Kai Express Sales OS" }],
  }),
  component: OpportunitiesPage,
});

type ViewMode = "kanban" | "table";

function OpportunitiesPage() {
  const { db, currentUser } = useCrm();
  const [view, setView] = useState<ViewMode>("kanban");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<Region | "all">("all");
  const [owner, setOwner] = useState<string>(
    currentUser.role === "sales_rep" ? currentUser.id : "all",
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.opportunities
      .filter((o) => (region === "all" ? true : o.region === region))
      .filter((o) =>
        owner === "all" ? true : owner === "unassigned" ? !o.owner_user_id : o.owner_user_id === owner,
      )
      .filter((o) => (!q ? true : o.name.toLowerCase().includes(q)));
  }, [db.opportunities, query, region, owner]);

  const open = openPipeline(filtered);
  const stageData = pipelineByStage(filtered);

  return (
    <>
      <PageHeader
        eyebrow="Revenue pipeline"
        title="Opportunities"
        description="All deals in the funnel — drag or advance stage from the deal detail page."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Open pipeline"
          value={formatCurrency(sumAmount(open))}
          hint={`${open.length} deals`}
          tone="success"
        />
        <StatCard
          label="Weighted pipeline"
          value={formatCurrency(weightedAmount(open))}
          hint="Probability-adjusted"
        />
        <StatCard
          label="Won this period"
          value={formatCurrency(
            sumAmount(filtered.filter((o) => o.stage === "Won")),
          )}
          tone="success"
        />
        <StatCard
          label="Lost"
          value={filtered.filter((o) => o.stage === "Lost").length}
          hint="Deals lost"
          tone="danger"
        />
      </div>

      {/* Filters + view toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search opportunity name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={region} onValueChange={(v) => setRegion(v as Region | "all")}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="Asia">Asia</SelectItem>
          </SelectContent>
        </Select>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {db.users
              .filter((u) => u.role === "sales_rep")
              .map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button
            onClick={() => setView("kanban")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "kanban" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Kanban view"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "table" ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Table view"
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stageData
            .filter((s) => s.stage !== "Won" && s.stage !== "Lost")
            .map(({ stage }) => {
              const cards = filtered.filter((o) => o.stage === stage);
              return (
                <div key={stage} className="w-72 shrink-0">
                  <div className="mb-2 flex items-center justify-between">
                    <StageBadge stage={stage as OpportunityStage} />
                    <span className="text-xs text-muted-foreground">
                      {cards.length} · {formatCurrency(sumAmount(cards))}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {cards.length ? (
                      cards.map((o) => (
                        <Link
                          key={o.id}
                          to="/opportunities/$opportunityId"
                          params={{ opportunityId: o.id }}
                          className="block rounded-xl border border-border bg-surface p-3 transition-colors hover:border-ember/40 hover:bg-surface-muted"
                        >
                          <p className="text-sm font-medium leading-snug">{o.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {accountName(db, o.account_id)}
                          </p>
                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <span className="font-display text-sm font-semibold tabular-nums">
                              {formatCurrency(o.amount)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatShortDate(o.expected_close_date)}
                            </span>
                          </div>
                          {o.next_action && (
                            <p className="mt-1.5 truncate rounded bg-surface-muted px-2 py-1 text-[11px] text-muted-foreground">
                              → {o.next_action}
                            </p>
                          )}
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            {userName(db, o.owner_user_id)} · {o.probability}%
                          </p>
                        </Link>
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        No deals
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Won & Lost summary columns */}
          {(["Won", "Lost"] as OpportunityStage[]).map((stage) => {
            const cards = filtered.filter((o) => o.stage === stage);
            return (
              <div key={stage} className="w-64 shrink-0 opacity-70">
                <div className="mb-2 flex items-center justify-between">
                  <StageBadge stage={stage} />
                  <span className="text-xs text-muted-foreground">
                    {cards.length} · {formatCurrency(sumAmount(cards))}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {cards.slice(0, 5).map((o) => (
                    <Link
                      key={o.id}
                      to="/opportunities/$opportunityId"
                      params={{ opportunityId: o.id }}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs transition-colors hover:bg-surface-muted"
                    >
                      <span className="min-w-0 truncate font-medium">{o.name}</span>
                      <span className="shrink-0 tabular-nums">{formatCurrency(o.amount)}</span>
                    </Link>
                  ))}
                  {cards.length > 5 && (
                    <p className="text-center text-xs text-muted-foreground">
                      +{cards.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Panel bodyClassName="p-0">
          {filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Opportunity</th>
                    <th className="px-4 py-2.5 text-left font-medium">Account</th>
                    <th className="px-4 py-2.5 text-left font-medium">Stage</th>
                    <th className="px-4 py-2.5 text-left font-medium">Amount</th>
                    <th className="px-4 py-2.5 text-left font-medium">Probability</th>
                    <th className="px-4 py-2.5 text-left font-medium">Close date</th>
                    <th className="px-4 py-2.5 text-left font-medium">Owner</th>
                    <th className="px-4 py-2.5 text-left font-medium">Next action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((o) => (
                    <tr key={o.id} className="transition-colors hover:bg-surface-muted">
                      <td className="px-4 py-2.5">
                        <Link
                          to="/opportunities/$opportunityId"
                          params={{ opportunityId: o.id }}
                          className="font-medium hover:text-ember hover:underline"
                        >
                          {o.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        <Link
                          to="/accounts/$accountId"
                          params={{ accountId: o.account_id }}
                          className="hover:text-ember hover:underline"
                        >
                          {accountName(db, o.account_id)}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <StageBadge stage={o.stage} />
                      </td>
                      <td className="px-4 py-2.5 font-display font-semibold tabular-nums">
                        {formatCurrency(o.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{o.probability}%</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatShortDate(o.expected_close_date)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {userName(db, o.owner_user_id)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-muted-foreground">
                        {o.next_action ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4">
              <EmptyState>No opportunities match these filters.</EmptyState>
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
