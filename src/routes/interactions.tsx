import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
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
import { TypeBadge } from "@/components/crm/badges";
import { InteractionTimeline } from "@/components/crm/InteractionTimeline";
import { LogInteractionDialog } from "@/components/crm/LogInteractionDialog";
import { useCrm } from "@/lib/crm/provider";
import { downloadCsv } from "@/lib/crm/csv";
import { userName } from "@/lib/crm/selectors";
import { INTERACTION_TYPES, type InteractionType } from "@/lib/crm/types";

export const Route = createFileRoute("/interactions")({
  head: () => ({
    meta: [{ title: "Interactions — Yo-Kai Express Sales OS" }],
  }),
  component: InteractionsPage,
});

function InteractionsPage() {
  const { db, currentUser } = useCrm();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<InteractionType | "all">("all");
  const [owner, setOwner] = useState<string>(
    currentUser.role === "sales_rep" ? currentUser.id : "all",
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.interactions
      .filter((i) => (type === "all" ? true : i.type === type))
      .filter((i) => (owner === "all" ? true : i.owner_user_id === owner))
      .filter((i) =>
        !q
          ? true
          : i.subject.toLowerCase().includes(q) || (i.notes ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  }, [db.interactions, query, type, owner]);

  // Type breakdown counts
  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    db.interactions.forEach((i) => {
      map[i.type] = (map[i.type] ?? 0) + 1;
    });
    return map;
  }, [db.interactions]);

  const thisMonth = useMemo(() => {
    const prefix = new Date().toISOString().slice(0, 7);
    return db.interactions.filter((i) => i.occurred_at.startsWith(prefix)).length;
  }, [db.interactions]);

  return (
    <>
      <PageHeader
        eyebrow="Activity log"
        title="Interactions"
        description="Every email, call, meeting and demo logged across all accounts and leads."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadCsv(`interactions-${new Date().toISOString().slice(0, 10)}.csv`, rows);
                toast.success(`Exported ${rows.length} interactions`, {
                  description: "Opens directly in Excel or Google Sheets.",
                });
              }}
            >
              <Download className="size-3.5" /> Export CSV
            </Button>
            <LogInteractionDialog
              trigger={<Button size="sm">Log interaction</Button>}
              related={{}}
            />
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total logged" value={db.interactions.length} />
        <StatCard label="This month" value={thisMonth} tone="brand" />
        <StatCard label="Meetings" value={typeCounts["Meeting"] ?? 0} />
        <StatCard label="Calls" value={typeCounts["Call"] ?? 0} />
      </div>

      {/* Type filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setType("all")}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            type === "all"
              ? "border-ember bg-ember/10 text-ember"
              : "border-border hover:bg-surface-muted"
          }`}
        >
          All ({db.interactions.length})
        </button>
        {INTERACTION_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              type === t
                ? "border-ember bg-ember/10 text-ember"
                : "border-border hover:bg-surface-muted"
            }`}
          >
            {t} ({typeCounts[t] ?? 0})
          </button>
        ))}
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search subject or notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {db.users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} results</span>
        </div>

        <div className="p-4">
          {rows.length ? (
            <InteractionTimeline interactions={rows} />
          ) : (
            <EmptyState>No interactions match these filters.</EmptyState>
          )}
        </div>
      </Panel>
    </>
  );
}
