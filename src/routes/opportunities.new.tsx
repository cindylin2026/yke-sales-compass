import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, Field, EmptyState } from "@/components/crm/ui-bits";
import { FitScore } from "@/components/crm/badges";
import { OpportunityForm } from "@/components/crm/OpportunityForm";
import { useCrm } from "@/lib/crm/provider";
import type { ID } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/opportunities/new")({
  head: () => ({
    meta: [{ title: "New Opportunity — Yo-Kai Express Sales OS" }],
  }),
  component: NewOpportunityPage,
});

function NewOpportunityPage() {
  const { db } = useCrm();
  const [query, setQuery] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<ID | undefined>();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return db.accounts.slice(0, 8);
    return db.accounts
      .filter((a) => a.name.toLowerCase().includes(q) || (a.domain ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, db.accounts]);

  const account = db.accounts.find((a) => a.id === selectedAccountId);
  const contacts = db.contacts.filter((c) => c.account_id === selectedAccountId);

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/opportunities">
            <ArrowLeft className="size-4" /> Pipeline
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="Revenue pipeline"
        title="New opportunity"
        description="Pick the account this deal is with, then fill in the machine count."
      />

      <div className="mx-auto max-w-2xl space-y-5">
        <Panel title="Account">
          <Field label="Search accounts by name or domain">
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Marriott, HCA Healthcare…"
              />
            </div>
          </Field>

          {matches.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {matches.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAccountId(a.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    selectedAccountId === a.id
                      ? "border-ember bg-ember/5"
                      : "border-border hover:bg-surface-muted",
                  )}
                >
                  <FitScore value={a.account_fit_score} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.domain} · {a.segment} · {a.region}
                    </span>
                  </span>
                  {selectedAccountId === a.id ? <Check className="size-4 text-ember" /> : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <EmptyState>
                No accounts match.{" "}
                <Link to="/accounts/new" className="text-ember hover:underline">
                  Create the account first
                </Link>
                .
              </EmptyState>
            </div>
          )}
        </Panel>

        {account && (
          <Panel title={`Opportunity — ${account.name}`}>
            <OpportunityForm account={account} contacts={contacts} />
          </Panel>
        )}
      </div>
    </>
  );
}
