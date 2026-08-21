import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Panel, Field } from "@/components/crm/ui-bits";
import { FitScore } from "@/components/crm/badges";
import { useCrm } from "@/lib/crm/provider";
import { computeAccountFitScore } from "@/lib/crm/selectors";
import { ACCOUNT_SEGMENTS, REGIONS } from "@/lib/crm/types";
import type { AccountSegment, AccountStatus, Region } from "@/lib/crm/types";

export const Route = createFileRoute("/accounts/new")({
  head: () => ({
    meta: [{ title: "New Account — Yo-Kai Express Sales OS" }],
  }),
  component: NewAccountPage,
});

const RUBRIC: { key: keyof CriteriaState; label: string; hint: string }[] = [
  {
    key: "foot_traffic_score",
    label: "Foot Traffic / Demand Density",
    hint: "0 (quiet) → 5 (very high traffic)",
  },
  {
    key: "utility_readiness_score",
    label: "Utility Readiness",
    hint: "0 (needs major work) → 5 (plug and play)",
  },
  {
    key: "brand_alignment_score",
    label: "Brand Alignment",
    hint: "0 (poor fit) → 5 (perfect fit)",
  },
  {
    key: "contract_complexity_score",
    label: "Contract Complexity",
    hint: "0 (very complex) → 5 (simple)",
  },
  {
    key: "decision_maker_accessibility_score",
    label: "Decision-Maker Accessibility",
    hint: "0 (hard to reach) → 5 (direct access)",
  },
  {
    key: "expansion_potential_score",
    label: "Expansion Potential",
    hint: "0 (single site) → 5 (multi-site rollout)",
  },
];

interface CriteriaState {
  foot_traffic_score: number | undefined;
  utility_readiness_score: number | undefined;
  brand_alignment_score: number | undefined;
  contract_complexity_score: number | undefined;
  decision_maker_accessibility_score: number | undefined;
  expansion_potential_score: number | undefined;
}

function NewAccountPage() {
  const { currentUser, createAccount } = useCrm();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [segment, setSegment] = useState<AccountSegment>("Unknown");
  const [region, setRegion] = useState<Region>("North America");
  const [country, setCountry] = useState("United States");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [criteria, setCriteria] = useState<CriteriaState>({
    foot_traffic_score: undefined,
    utility_readiness_score: undefined,
    brand_alignment_score: undefined,
    contract_complexity_score: undefined,
    decision_maker_accessibility_score: undefined,
    expansion_potential_score: undefined,
  });

  const [saving, setSaving] = useState(false);

  const fitScore = useMemo(() => computeAccountFitScore(criteria), [criteria]);
  const filledCount = Object.values(criteria).filter((v) => v !== undefined).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSaving(true);
    try {
      const account = await createAccount({
        name: name.trim(),
        domain: domain.trim() || undefined,
        segment,
        region,
        country: country.trim(),
        city: city.trim() || undefined,
        status: "Target" as AccountStatus,
        owner_user_id: currentUser.id,
        notes: notes.trim() || undefined,
        ...criteria,
        ...(fitScore !== null ? { account_fit_score: fitScore } : {}),
      });
      toast.success(`Account created — ${account.name}`);
      void navigate({ to: "/accounts/$accountId", params: { accountId: account.id } });
    } catch (e) {
      toast.error("Failed to create account", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/accounts">
            <ArrowLeft className="size-4" /> All accounts
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="Outbound entry point"
        title="New account"
        description="Direct target-account research — no lead involved. Score the site as you assess it."
      />

      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
        <Panel title="Company information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name *">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marriott Ottawa"
                required
              />
            </Field>
            <Field label="Domain">
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="ottawamarriott.com"
              />
            </Field>
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
            <Field label="Region">
              <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Country">
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </Field>
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ottawa" />
            </Field>
          </div>
        </Panel>

        <Panel
          title="Fit assessment"
          description="Score what you observe on-site or in research — the fit score is calculated for you."
        >
          <div className="mb-4 flex items-center gap-4 rounded-lg border border-border bg-surface-muted p-4">
            {fitScore !== null ? (
              <FitScore value={fitScore} size="lg" />
            ) : (
              <div className="grid size-[72px] place-items-center rounded-full border-2 border-dashed border-border text-xs text-muted-foreground">
                {filledCount}/6
              </div>
            )}
            <div>
              <p className="text-sm font-medium">
                {fitScore !== null
                  ? `Account Fit Score — ${fitScore}`
                  : "Fill in all 6 criteria to compute a score"}
              </p>
              <p className="text-xs text-muted-foreground">
                Each item is 0–5. The total is scaled to a 0–100 fit score automatically.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {RUBRIC.map((r) => (
              <Field key={r.key} label={r.label} hint={r.hint}>
                <Select
                  {...(criteria[r.key] !== undefined ? { value: String(criteria[r.key]) } : {})}
                  onValueChange={(v) => setCriteria((c) => ({ ...c, [r.key]: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not scored" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ))}
          </div>
        </Panel>

        <Panel title="Notes">
          <Field
            label="Internal notes"
            hint="What do you know about this account that isn't captured above?"
          >
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Visited the lobby — high foot traffic, GM open to a pilot…"
            />
          </Field>
        </Panel>

        <div className="flex justify-end gap-3 pt-2">
          <Button asChild type="button" variant="outline">
            <Link to="/accounts">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create account"}
          </Button>
        </div>
      </form>
    </>
  );
}
