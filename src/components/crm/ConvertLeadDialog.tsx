import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Building2, Check, Search, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/crm/ui-bits";
import { FitScore } from "@/components/crm/badges";
import { useCrm } from "@/lib/crm/provider";
import { formatCurrency, leadName } from "@/lib/crm/selectors";
import { dayOffset } from "@/lib/crm/seed";
import type { AccountSegment, ID, Lead, OpportunityStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const SEGMENTS: AccountSegment[] = [
  "Hotel",
  "Airport",
  "University",
  "Hospital",
  "Office / Corporate",
  "Convenience Retail",
  "Distributor",
  "Entertainment",
];

/** Salesforce-style conversion: match-or-create Account, then Contact, then optional Opportunity. */
export function ConvertLeadDialog({ lead, trigger }: { lead: Lead; trigger: ReactNode }) {
  const { db, convertLead } = useCrm();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const [accountQuery, setAccountQuery] = useState(lead.company_name);
  const [selectedAccountId, setSelectedAccountId] = useState<ID | "new">("new");
  const [segment, setSegment] = useState<AccountSegment>("Hotel");
  const [fitScore, setFitScore] = useState(70);

  const [selectedContactId, setSelectedContactId] = useState<ID | "new">("new");

  const [createOpp, setCreateOpp] = useState(true);
  const [oppName, setOppName] = useState(`${lead.company_name} — initial kiosk program`);
  const [oppStage, setOppStage] = useState<OpportunityStage>("Discovery");
  const [amount, setAmount] = useState(40000);
  const [probability, setProbability] = useState(20);
  const [closeDate, setCloseDate] = useState(dayOffset(45));
  const [nextAction, setNextAction] = useState("Schedule discovery call");

  // Match on company name AND domain, the way a rep would.
  const accountMatches = useMemo(() => {
    const q = accountQuery.trim().toLowerCase();
    if (!q) return db.accounts.slice(0, 5);
    return db.accounts
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.domain ?? "").toLowerCase().includes(q) ||
          (lead.company_domain ? (a.domain ?? "") === lead.company_domain : false),
      )
      .slice(0, 6);
  }, [accountQuery, db.accounts, lead.company_domain]);

  const contactMatches = useMemo(() => {
    if (selectedAccountId === "new") {
      return db.contacts.filter((c) => c.email.toLowerCase() === lead.email.toLowerCase());
    }
    return db.contacts.filter(
      (c) => c.account_id === selectedAccountId || c.email.toLowerCase() === lead.email.toLowerCase(),
    );
  }, [db.contacts, selectedAccountId, lead.email]);

  const submit = () => {
    const result = convertLead({
      lead_id: lead.id,
      account_id: selectedAccountId === "new" ? null : selectedAccountId,
      ...(selectedAccountId === "new"
        ? {
            new_account: {
              name: accountQuery.trim() || lead.company_name,
              domain: lead.company_domain ?? "",
              segment,
              region: lead.region,
              country: lead.region === "Asia" ? "Singapore" : "United States",
              status: "Active Prospect" as const,
              account_fit_score: fitScore,
            },
          }
        : {}),
      contact_id: selectedContactId === "new" ? null : selectedContactId,
      create_contact: selectedContactId === "new",
      create_opportunity: createOpp,
      ...(createOpp
        ? {
            opportunity: {
              name: oppName,
              stage: oppStage,
              amount,
              probability,
              expected_close_date: closeDate,
              next_action: nextAction,
            },
          }
        : {}),
      owner_user_id: lead.owner_user_id,
    });

    toast.success("Lead converted", {
      description: `Lead ${lead.id} preserved with its source, campaign and lifecycle history.`,
    });
    setOpen(false);
    void navigate({ to: "/accounts/$accountId", params: { accountId: result.account_id } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Convert {leadName(lead)}</DialogTitle>
          <DialogDescription>
            Nothing is copied by hand. The lead record stays intact and is stamped with the Account,
            Contact and Opportunity IDs it produced.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-5">
          {/* Step 1 — Account */}
          <li className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
                1
              </span>
              <h3 className="text-sm font-semibold">Account</h3>
              <Building2 className="ml-auto size-4 text-muted-foreground" />
            </div>
            <Field label="Search existing accounts by name or domain">
              <div className="relative">
                <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                />
              </div>
            </Field>
            <div className="mt-3 space-y-1.5">
              {accountMatches.map((a) => (
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
              <button
                onClick={() => setSelectedAccountId("new")}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left text-sm transition-colors",
                  selectedAccountId === "new"
                    ? "border-ember bg-ember/5"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                <UserPlus className="size-4" />
                Create new account &ldquo;{accountQuery || lead.company_name}&rdquo;
              </button>
            </div>
            {selectedAccountId === "new" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Segment">
                  <Select value={segment} onValueChange={(v) => setSegment(v as AccountSegment)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEGMENTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Account Fit Score" hint="ICP fit of the company — separate from lead score">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={fitScore}
                    onChange={(e) => setFitScore(Number(e.target.value))}
                  />
                </Field>
              </div>
            ) : null}
          </li>

          {/* Step 2 — Contact */}
          <li className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
                2
              </span>
              <h3 className="text-sm font-semibold">Contact</h3>
            </div>
            <div className="space-y-1.5">
              {contactMatches.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContactId(c.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    selectedContactId === c.id
                      ? "border-ember bg-ember/5"
                      : "border-border hover:bg-surface-muted",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {c.first_name} {c.last_name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.title} · {c.email}
                    </span>
                  </span>
                  {selectedContactId === c.id ? <Check className="size-4 text-ember" /> : null}
                </button>
              ))}
              <button
                onClick={() => setSelectedContactId("new")}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left text-sm transition-colors",
                  selectedContactId === "new"
                    ? "border-ember bg-ember/5"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                <UserPlus className="size-4" />
                Create contact from lead — {leadName(lead)} ({lead.email})
              </button>
            </div>
          </li>

          {/* Step 3 — Opportunity */}
          <li className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
                3
              </span>
              <h3 className="text-sm font-semibold">Opportunity (optional)</h3>
              <label className="ml-auto flex items-center gap-2 text-xs">
                <Checkbox checked={createOpp} onCheckedChange={(v) => setCreateOpp(Boolean(v))} />
                Create one now
              </label>
            </div>
            {createOpp ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Opportunity name">
                    <Input value={oppName} onChange={(e) => setOppName(e.target.value)} />
                  </Field>
                </div>
                <Field label="Stage">
                  <Select value={oppStage} onValueChange={(v) => setOppStage(v as OpportunityStage)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["Discovery", "Proposal", "Negotiation"] as OpportunityStage[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={`Amount — ${formatCurrency(amount)}`}>
                  <Input
                    type="number"
                    step={1000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </Field>
                <Field label="Probability %">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={probability}
                    onChange={(e) => setProbability(Number(e.target.value))}
                  />
                </Field>
                <Field label="Expected close date">
                  <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Next action">
                    <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
                  </Field>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No opportunity will be created. You can add one later from the Account 360 page.
              </p>
            )}
          </li>
        </ol>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <p className="mr-auto text-xs text-muted-foreground">
            Lead {lead.id} · {lead.source} · Campaign preserved
          </p>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            Convert lead <ArrowRight className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
