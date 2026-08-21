import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, EmptyState, StatCard } from "@/components/crm/ui-bits";
import { AccountStatusBadge, FitScore } from "@/components/crm/badges";
import { useCrm } from "@/lib/crm/provider";
import { downloadCsv } from "@/lib/crm/csv";
import {
  formatShortDate,
  openPipeline,
  sumAmount,
  formatCurrency,
  userName,
} from "@/lib/crm/selectors";
import { ACCOUNT_SEGMENTS, REGIONS } from "@/lib/crm/types";
import type { AccountStatus, AccountSegment, Region } from "@/lib/crm/types";

export const Route = createFileRoute("/accounts/")({
  head: () => ({
    meta: [{ title: "Accounts — Yo-Kai Express Sales OS" }],
  }),
  component: AccountsPage,
});

const STATUSES: AccountStatus[] = ["Target", "Active Prospect", "Customer", "On Hold", "Churned"];

const MIN_SCORE_OPTIONS = [
  { value: "0", label: "Any score" },
  { value: "80", label: "80+" },
  { value: "60", label: "60+" },
  { value: "40", label: "40+" },
  { value: "20", label: "20+" },
];

function AccountsPage() {
  const { db, currentUser } = useCrm();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AccountStatus | "all">("all");
  const [segment, setSegment] = useState<AccountSegment | "all">("all");
  const [region, setRegion] = useState<Region | "all">("all");
  const [market, setMarket] = useState<string>("all");
  const [minScore, setMinScore] = useState("0");

  const markets = useMemo(
    () => Array.from(new Set(db.accounts.map((a) => a.market).filter(Boolean))) as string[],
    [db.accounts],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.accounts
      .filter((a) => (status === "all" ? true : a.status === status))
      .filter((a) => (segment === "all" ? true : a.segment === segment))
      .filter((a) => (region === "all" ? true : a.region === region))
      .filter((a) => (market === "all" ? true : a.market === market))
      .filter((a) => a.account_fit_score >= Number(minScore))
      .filter((a) =>
        !q ? true : a.name.toLowerCase().includes(q) || (a.domain ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => b.account_fit_score - a.account_fit_score);
  }, [db.accounts, query, status, segment, region, market, minScore]);

  const customers = db.accounts.filter((a) => a.status === "Customer").length;
  const activeProspects = db.accounts.filter((a) => a.status === "Active Prospect").length;
  const openPipelineValue = sumAmount(openPipeline(db.opportunities));

  return (
    <>
      <PageHeader
        eyebrow="Account management"
        title="Accounts"
        description="Every company YKE is selling to, targeting, or has won. Ranked by ICP fit score."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                downloadCsv(`accounts-${new Date().toISOString().slice(0, 10)}.csv`, rows);
                toast.success(`Exported ${rows.length} accounts`, {
                  description: "Opens directly in Excel or Google Sheets.",
                });
              }}
            >
              <Download className="size-4" /> Export CSV
            </Button>
            <Button asChild>
              <Link to="/accounts/new">New account</Link>
            </Button>
          </div>
        }
      />

      {/* Filters — kept next to Export CSV above so it's a one-glance "pick a target list, export it" flow */}
      <Panel bodyClassName="p-0" className="mb-5">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search name or domain"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus | "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={segment} onValueChange={(v) => setSegment(v as AccountSegment | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All segments</SelectItem>
              {ACCOUNT_SEGMENTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={(v) => setRegion(v as Region | "all")}>
            <SelectTrigger className="w-[130px]">
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
          {markets.length > 0 && (
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All markets</SelectItem>
                {markets.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={minScore} onValueChange={setMinScore}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Fit score" />
            </SelectTrigger>
            <SelectContent>
              {MIN_SCORE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} matching</span>
        </div>
      </Panel>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total accounts" value={db.accounts.length} />
        <StatCard label="Customers" value={customers} tone="success" />
        <StatCard label="Active prospects" value={activeProspects} tone="brand" />
        <StatCard
          label="Open pipeline"
          value={formatCurrency(openPipelineValue)}
          tone="success"
          hint="All open opps"
        />
      </div>

      <Panel bodyClassName="p-0">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Fit</th>
                  <th className="px-4 py-2.5 text-left font-medium">Account</th>
                  <th className="px-4 py-2.5 text-left font-medium">Segment</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium">Region</th>
                  <th className="px-4 py-2.5 text-left font-medium">Owner</th>
                  <th className="px-4 py-2.5 text-left font-medium">Locations</th>
                  <th className="px-4 py-2.5 text-left font-medium">Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-surface-muted">
                    <td className="px-4 py-2.5">
                      <FitScore value={a.account_fit_score} size="sm" />
                    </td>
                    <td className="max-w-[240px] px-4 py-2.5">
                      <Link
                        to="/accounts/$accountId"
                        params={{ accountId: a.id }}
                        className="block truncate font-medium hover:text-ember hover:underline"
                      >
                        {a.name}
                      </Link>
                      {a.domain && (
                        <p className="truncate text-xs text-muted-foreground">{a.domain}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.segment}</td>
                    <td className="px-4 py-2.5">
                      <AccountStatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.region}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {userName(db, a.owner_user_id)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {a.locations_count ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatShortDate(a.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState>No accounts match these filters.</EmptyState>
          </div>
        )}
      </Panel>
    </>
  );
}
