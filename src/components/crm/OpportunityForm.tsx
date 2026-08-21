import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/crm/ui-bits";
import { useCrm } from "@/lib/crm/provider";
import {
  BOBA_RSP_HIGH,
  BOBA_RSP_LOW,
  DEFAULT_DAILY_BOBA_UNITS_HIGH,
  DEFAULT_DAILY_BOBA_UNITS_LOW,
  DEFAULT_DAILY_RAMEN_UNITS_HIGH,
  DEFAULT_DAILY_RAMEN_UNITS_LOW,
  RAMEN_RSP_HIGH,
  RAMEN_RSP_LOW,
  computeOpportunityAmountRange,
  formatCurrency,
} from "@/lib/crm/selectors";
import { dayOffset } from "@/lib/crm/seed";
import type { Account, Contact, ID, Opportunity, OpportunityStage } from "@/lib/crm/types";

/**
 * Shared opportunity-creation fields — used by both CreateOpportunityDialog
 * (account already known, e.g. from the Account page) and the standalone
 * /opportunities/new page (account picked first, no dialog).
 */
export function OpportunityForm({
  account,
  contacts,
  onCreated,
  onCancel,
}: {
  account: Account;
  contacts: Contact[];
  onCreated?: (opp: Opportunity) => void;
  onCancel?: () => void;
}) {
  const { currentUser, createOpportunity, createTask } = useCrm();
  const navigate = useNavigate();

  const [name, setName] = useState(`${account.name} — new opportunity`);
  const [contactId, setContactId] = useState<ID | "none">(
    contacts.find((c) => c.is_primary)?.id ?? contacts[0]?.id ?? "none",
  );
  const [stage, setStage] = useState<OpportunityStage>("Discovery");
  const [bobaQty, setBobaQty] = useState(0);
  const [ramenQty, setRamenQty] = useState(1);
  const [bobaUnitsLow, setBobaUnitsLow] = useState(DEFAULT_DAILY_BOBA_UNITS_LOW);
  const [bobaUnitsHigh, setBobaUnitsHigh] = useState(DEFAULT_DAILY_BOBA_UNITS_HIGH);
  const [ramenUnitsLow, setRamenUnitsLow] = useState(DEFAULT_DAILY_RAMEN_UNITS_LOW);
  const [ramenUnitsHigh, setRamenUnitsHigh] = useState(DEFAULT_DAILY_RAMEN_UNITS_HIGH);
  const [probability, setProbability] = useState(20);
  const [closeDate, setCloseDate] = useState(dayOffset(45));
  const [nextAction, setNextAction] = useState("Schedule discovery call");
  const [nextActionDueDate, setNextActionDueDate] = useState(dayOffset(3));

  const [submitting, setSubmitting] = useState(false);

  const range = useMemo(
    () =>
      computeOpportunityAmountRange({
        boba_machine_qty: bobaQty,
        ramen_machine_qty: ramenQty,
        avg_daily_boba_units_low: bobaUnitsLow,
        avg_daily_boba_units_high: bobaUnitsHigh,
        avg_daily_ramen_units_low: ramenUnitsLow,
        avg_daily_ramen_units_high: ramenUnitsHigh,
        operating_days_per_year: account.operating_days_per_year,
      }),
    [
      bobaQty,
      ramenQty,
      bobaUnitsLow,
      bobaUnitsHigh,
      ramenUnitsLow,
      ramenUnitsHigh,
      account.operating_days_per_year,
    ],
  );
  const hasRevenueRange = range.high > range.base;

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Opportunity name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const opp = await createOpportunity({
        name: name.trim(),
        account_id: account.id,
        primary_contact_id: contactId === "none" ? null : contactId,
        owner_user_id: currentUser.id,
        stage,
        amount: 0, // computed by the DB trigger from machine quantities
        boba_machine_qty: bobaQty,
        ramen_machine_qty: ramenQty,
        avg_daily_boba_units_low: bobaUnitsLow,
        avg_daily_boba_units_high: bobaUnitsHigh,
        avg_daily_ramen_units_low: ramenUnitsLow,
        avg_daily_ramen_units_high: ramenUnitsHigh,
        probability,
        expected_close_date: closeDate,
        next_action: nextAction.trim() || undefined,
        region: account.region,
      });

      if (nextAction.trim()) {
        await createTask({
          title: nextAction.trim(),
          type: "Follow-up",
          owner_user_id: currentUser.id,
          account_id: account.id,
          contact_id: contactId === "none" ? undefined : contactId,
          opportunity_id: opp.id,
          due_date: nextActionDueDate,
          status: "Open",
          priority: "Normal",
          next_action: nextAction.trim(),
        });
      }

      toast.success("Opportunity created", {
        description: `${formatCurrency(range.base)} · ${stage}`,
      });
      onCreated?.(opp);
      void navigate({ to: "/opportunities/$opportunityId", params: { opportunityId: opp.id } });
    } catch (e) {
      toast.error("Failed to create opportunity", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <Field label="Opportunity name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Contact">
          <Select value={contactId} onValueChange={(v) => setContactId(v as ID | "none")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No contact</SelectItem>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                  {c.is_primary ? " (Primary)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Stage">
            <Select value={stage} onValueChange={(v) => setStage(v as OpportunityStage)}>
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
          <Field label="Probability %">
            <Input
              type="number"
              min={0}
              max={100}
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
            />
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
        </div>

        <Field
          label={
            hasRevenueRange
              ? `Amount (36-mo TCV) — ${formatCurrency(range.low)} – ${formatCurrency(range.high)}`
              : `Amount (36-mo TCV) — ${formatCurrency(range.base)}`
          }
          hint="Base licensing/lease value, computed automatically from machine count"
        >
          <div className="rounded-lg border border-dashed border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
            {hasRevenueRange
              ? `${formatCurrency(range.low)} – ${formatCurrency(range.high)}`
              : formatCurrency(range.base)}
          </div>
        </Field>

        {!account.operating_days_per_year && (
          <p className="text-xs text-muted-foreground">
            No operating-hours assumption for this vertical yet, so the range below won't move off
            the base amount.
          </p>
        )}

        {bobaQty > 0 && (
          <Field
            label="Boba — daily cups sold per machine"
            hint={`RSP fixed at ${formatCurrency(BOBA_RSP_LOW)}–${formatCurrency(BOBA_RSP_HIGH)}/cup. Adjust only the volume if you know this site.`}
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={0}
                placeholder="Conservative"
                value={bobaUnitsLow}
                onChange={(e) => setBobaUnitsLow(Math.max(0, Number(e.target.value)))}
              />
              <Input
                type="number"
                min={0}
                placeholder="Optimistic"
                value={bobaUnitsHigh}
                onChange={(e) => setBobaUnitsHigh(Math.max(0, Number(e.target.value)))}
              />
            </div>
          </Field>
        )}

        {ramenQty > 0 && (
          <Field
            label="Ramen — daily bowls sold per machine"
            hint={`RSP fixed at ${formatCurrency(RAMEN_RSP_LOW)}–${formatCurrency(RAMEN_RSP_HIGH)}/bowl. Adjust only the volume if you know this site.`}
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={0}
                placeholder="Conservative"
                value={ramenUnitsLow}
                onChange={(e) => setRamenUnitsLow(Math.max(0, Number(e.target.value)))}
              />
              <Input
                type="number"
                min={0}
                placeholder="Optimistic"
                value={ramenUnitsHigh}
                onChange={(e) => setRamenUnitsHigh(Math.max(0, Number(e.target.value)))}
              />
            </div>
          </Field>
        )}

        <Field label="Expected close date">
          <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
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

      <div className="mt-6 flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button onClick={() => void submit()} disabled={submitting}>
          {submitting ? "Creating…" : "Create opportunity"}
          {!submitting && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </>
  );
}
