import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Panel, EmptyState } from "@/components/crm/ui-bits";
import { LeadScore, LifecycleBadge, SourceBadge } from "@/components/crm/badges";
import { useCrm } from "@/lib/crm/provider";
import { downloadCsv } from "@/lib/crm/csv";
import { formatShortDate, leadName, relativeDay, userName } from "@/lib/crm/selectors";
import {
  ACCOUNT_SEGMENTS,
  REGIONS,
  LEAD_SOURCES,
  LEAD_STAGES,
  type AccountSegment,
  type LeadLifecycleStage,
  type Region,
} from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const MIN_SCORE_OPTIONS = [
  { value: "0", label: "Any score" },
  { value: "80", label: "80+" },
  { value: "60", label: "60+" },
  { value: "40", label: "40+" },
  { value: "20", label: "20+" },
];

export const Route = createFileRoute("/leads/")({
  head: () => ({
    meta: [
      { title: "Leads — Yo-Kai Express Sales OS" },
      {
        name: "description",
        content:
          "Every YKE lead with its lifecycle stage (New, MQL, SAL, SQL, Converted), source, campaign and owner.",
      },
      { property: "og:title", content: "Leads — Yo-Kai Express Sales OS" },
      {
        property: "og:description",
        content:
          "Qualify and route inbound and outbound leads through the MQL → SAL → SQL lifecycle.",
      },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const { db, currentUser } = useCrm();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<LeadLifecycleStage | "all">("all");
  const [source, setSource] = useState<string>("all");
  const [region, setRegion] = useState<Region | "all">("all");
  const [market, setMarket] = useState<string>("all");
  const [segment, setSegment] = useState<AccountSegment | "all">("all");
  const [minScore, setMinScore] = useState("0");
  const [owner, setOwner] = useState<string>(
    currentUser.role === "sales_rep" ? currentUser.id : "all",
  );

  const markets = useMemo(
    () => Array.from(new Set(db.leads.map((l) => l.market).filter(Boolean))) as string[],
    [db.leads],
  );

  const stageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    db.leads.forEach((l) => {
      map[l.lifecycle_stage] = (map[l.lifecycle_stage] ?? 0) + 1;
    });
    return map;
  }, [db.leads]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.leads
      .filter((l) => (stage === "all" ? true : l.lifecycle_stage === stage))
      .filter((l) => (source === "all" ? true : l.source === source))
      .filter((l) => (region === "all" ? true : l.region === region))
      .filter((l) => (market === "all" ? true : l.market === market))
      .filter((l) => (segment === "all" ? true : l.segment === segment))
      .filter((l) => l.lead_score >= Number(minScore))
      .filter((l) =>
        owner === "all"
          ? true
          : owner === "unassigned"
            ? !l.owner_user_id
            : l.owner_user_id === owner,
      )
      .filter((l) =>
        !q
          ? true
          : leadName(l).toLowerCase().includes(q) ||
            l.company_name.toLowerCase().includes(q) ||
            l.email.toLowerCase().includes(q),
      )
      .sort((a, b) => b.lead_score - a.lead_score);
  }, [db.leads, query, stage, source, region, market, segment, minScore, owner]);

  return (
    <>
      <PageHeader
        eyebrow="Pipeline entry point"
        title="Leads"
        description="A lead is meaningful commercial interest — not a like or a follow. Qualify it, then convert it."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                downloadCsv(`leads-${new Date().toISOString().slice(0, 10)}.csv`, rows);
                toast.success(`Exported ${rows.length} leads`, {
                  description: "Opens directly in Excel or Google Sheets.",
                });
              }}
            >
              <Download className="size-4" /> Export CSV
            </Button>
            <Button asChild>
              <Link to="/leads/new">New lead</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setStage("all")}
          className={cn(
            "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
            stage === "all" ? "border-ember bg-ember/5" : "border-border hover:bg-surface-muted",
          )}
        >
          <span className="block font-display text-lg font-semibold">{db.leads.length}</span>
          All leads
        </button>
        {LEAD_STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
              stage === s ? "border-ember bg-ember/5" : "border-border hover:bg-surface-muted",
            )}
          >
            <span className="block font-display text-lg font-semibold">{stageCounts[s] ?? 0}</span>
            {s}
          </button>
        ))}
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search name, company or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
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
          <Select value={segment} onValueChange={(v) => setSegment(v as AccountSegment | "all")}>
            <SelectTrigger className="w-[170px]">
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
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-[180px]">
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
          <Select value={minScore} onValueChange={setMinScore}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Lead score" />
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

        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Lead</th>
                  <th className="px-4 py-2.5 text-left font-medium">Company</th>
                  <th className="px-4 py-2.5 text-left font-medium">Stage</th>
                  <th className="px-4 py-2.5 text-left font-medium">Score</th>
                  <th className="px-4 py-2.5 text-left font-medium">Source</th>
                  <th className="px-4 py-2.5 text-left font-medium">Owner</th>
                  <th className="px-4 py-2.5 text-left font-medium">Created</th>
                  <th className="px-4 py-2.5 text-left font-medium">Last touch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-surface-muted">
                    <td className="max-w-[180px] px-4 py-2.5">
                      <Link
                        to="/leads/$leadId"
                        params={{ leadId: l.id }}
                        className="block truncate font-medium hover:text-ember hover:underline"
                      >
                        {leadName(l)}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{l.title}</p>
                    </td>
                    <td className="max-w-[220px] px-4 py-2.5">
                      <p className="truncate">{l.company_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.segment ?? "Unknown"} · {l.region}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <LifecycleBadge stage={l.lifecycle_stage} />
                    </td>
                    <td className="px-4 py-2.5">
                      <LeadScore value={l.lead_score} />
                    </td>
                    <td className="px-4 py-2.5">
                      <SourceBadge source={l.source} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {userName(db, l.owner_user_id)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatShortDate(l.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {l.last_contacted_at ? relativeDay(l.last_contacted_at) : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState>No leads match these filters.</EmptyState>
          </div>
        )}
      </Panel>
    </>
  );
}
