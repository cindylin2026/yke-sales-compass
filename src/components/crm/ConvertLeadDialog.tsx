import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Building2, Check, Search, TriangleAlert, UserPlus } from "lucide-react";
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
import { computeOpportunityAmount, formatCurrency, leadName } from "@/lib/crm/selectors";
import { dayOffset } from "@/lib/crm/seed";
import { ACCOUNT_SEGMENTS, REGION_DEFAULT_COUNTRY } from "@/lib/crm/types";
import type { AccountSegment, ID, Lead, OpportunityStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

/** Salesforce-style conversion: match-or-create Account, then Contact, then optional Opportunity. */
export function ConvertLeadDialog({ lead, trigger }: { lead: Lead; trigger: ReactNode }) {
  const { db, convertLead } = useCrm();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const [accountQuery, setAccountQuery] = useState(lead.company_name);
  const [selectedAccountId, setSelectedAccountId] = useState<ID | "new">("new");
  const [segment, setSegment] = useState<AccountSegment>(lead.segment ?? "Unknown");
  const [fitScore, setFitScore] = useState(70);

  const [selectedContactId, setSelectedContactId] = useState<ID | "new">("new");

  const [createOpp, setCreateOpp] = useState(true);
  const [oppName, setOppName] = useState(`${lead.company_name} — initial kiosk program`);
  const [oppStage, setOppStage] = useState<OpportunityStage>("Discovery");
  const [bobaQty, setBobaQty] = useState(0);
  const [ramenQty, setRamenQty] = useState(1);
  const [probability, setProbability] = useState(20);
  const [closeDate, setCloseDate] = useState(dayOffset(45));
  const [nextAction, setNextAction] = useState("Schedule discovery call");
  const [nextActionDueDate, setNextActionDueDate] = useState(dayOffset(3));

  const [submitting, setSubmitting] = useState(false);

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
      (c) =>
        c.account_id === selectedAccountId || c.email.toLowerCase() === lead.email.toLowerCase(),
    );
  }, [db.contacts, selectedAccountId, lead.email]);

  const exactAccountDuplicate = useMemo(() => {
    if (selectedAccountId !== "new") return undefined;
    const q = accountQuery.trim().toLowerCase();
    if (!q) return undefined;
    return db.accounts.find((a) => a.name.trim().toLowerCase() === q);
  }, [selectedAccountId, accountQuery, db.accounts]);

  const oppAmount = computeOpportunityAmount({
    boba_machine_qty: bobaQty,
    ramen_machine_qty: ramenQty,
  });

  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await convertLead({
        lead_id: lead.id,
        account_id: selectedAccountId === "new" ? null : selectedAccountId,
        ...(selectedAccountId === "new"
          ? {
              new_account: {
                name: accountQuery.trim() || lead.company_name,
                domain: lead.company_domain,
                segment,
                region: lead.region,
                country: REGION_DEFAULT_COUNTRY[lead.region] ?? "",
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
                boba_machine_qty: bobaQty,
                ramen_machine_qty: ramenQty,
                probability,
                expected_close_date: closeDate,
                next_action: nextAction,
                next_action_due_date: nextActionDueDate,
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
    } catch (e) {
      toast.error("Failed to convert lead", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
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
            {exactAccountDuplicate ? (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/[0.07] px-3 py-2 text-xs text-warning-foreground">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  &ldquo;{exactAccountDuplicate.name}&rdquo; already exists — pick it above instead
                  of creating a duplicate, unless this is genuinely a different company.
                </span>
              </div>
            ) : null}
            {selectedAccountId === "new" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Segment">
                  <Select value={segment} onValueChange={(v) => setSegment(v as AccountSegment)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_SEGMENTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Account Fit Score"
                  hint="ICP fit of the company — separate from lead score"
                >
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
                  <Select
                    value={oppStage}
                    onValueChange={(v) => setOppStage(v as OpportunityStage)}
                  >
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
                <Field label="Boba machines">
                  <Input
                    type="number"
                    min={0}
                    value={bobaQty}
                    onChange={(e) => setBobaQty(Math.max(0, Number(e.target.value)))}
                  />
                </Field>
                <Field label="Ramen machines">
                  <Input
                    type="number"
                    min={0}
                    value={ramenQty}
                    onChange={(e) => setRamenQty(Math.max(0, Number(e.target.value)))}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    label={`Amount (36-mo TCV) — ${formatCurrency(oppAmount)}`}
                    hint="Computed automatically from machine count"
                  >
                    <div className="rounded-lg border border-dashed border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
                      {formatCurrency(oppAmount)}
                    </div>
                  </Field>
                </div>
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
                  <Input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                  />
                </Field>
                <Field label="Next action" hint="Creates an open follow-up task">
                  <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
                </Field>
                <Field label="Next action due">
                  <Input
                    type="date"
                    value={nextActionDueDate}
                    onChange={(e) => setNextActionDueDate(e.target.value)}
                  />
                </Field>
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting ? "Converting…" : "Convert lead"}
            {!submitting && <ArrowRight className="size-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
