import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Panel, DetailRow, EmptyState, StatCard } from "@/components/crm/ui-bits";
import { StageBadge, TypeBadge } from "@/components/crm/badges";
import { InteractionTimeline } from "@/components/crm/InteractionTimeline";
import { TaskList } from "@/components/crm/TaskList";
import { LogInteractionDialog } from "@/components/crm/LogInteractionDialog";
import { useCrm } from "@/lib/crm/provider";
import {
  accountName,
  contactName,
  formatCurrency,
  formatDate,
  formatShortDate,
  relatedInteractions,
  relatedTasks,
  relativeDay,
  userName,
} from "@/lib/crm/selectors";
import { OPPORTUNITY_STAGES, type OpportunityStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/opportunities/$opportunityId")({
  head: () => ({
    meta: [{ title: "Opportunity — Yo-Kai Express Sales OS" }],
  }),
  component: OpportunityDetailPage,
});

function OpportunityDetailPage() {
  const { opportunityId } = Route.useParams();
  const { db, updateOpportunityStage } = useCrm();

  const opp = db.opportunities.find((o) => o.id === opportunityId);
  if (!opp) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Opportunity not found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/opportunities">Back to opportunities</Link>
        </Button>
      </div>
    );
  }

  const interactions = relatedInteractions(db.interactions, { opportunityId });
  const tasks = relatedTasks(db.tasks, { opportunityId });
  const openTasks = tasks.filter((t) => t.status === "Open");
  const isClosed = opp.stage === "Won" || opp.stage === "Lost";

  // Stage pipeline steps (open stages only)
  const openStages: OpportunityStage[] = ["Discovery", "Demo", "Proposal", "Negotiation"];
  const currentIdx = openStages.indexOf(opp.stage as OpportunityStage);

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
        eyebrow={`Opportunity · ${opp.region}`}
        title={opp.name}
        description={accountName(db, opp.account_id)}
        actions={
          <>
            {!isClosed && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateOpportunityStage(opp.id, "Lost")}
                >
                  Mark Lost
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateOpportunityStage(opp.id, "Won")}
                  className="bg-success text-success-foreground hover:bg-success/90"
                >
                  Mark Won
                </Button>
              </>
            )}
            <LogInteractionDialog
              trigger={
                <Button size="sm" variant={isClosed ? "default" : "outline"}>
                  Log interaction
                </Button>
              }
              related={{
                opportunityId,
                accountId: opp.account_id,
                contactId: opp.primary_contact_id,
              }}
            />
          </>
        }
      />

      {/* Stage stepper */}
      <div className="mb-5 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-1">
          {OPPORTUNITY_STAGES.map((stage, idx) => {
            const isCurrent = opp.stage === stage;
            const isPast = OPPORTUNITY_STAGES.indexOf(opp.stage) > idx && opp.stage !== "Lost";
            const isWon = stage === "Won" && opp.stage === "Won";
            const isLost = stage === "Lost" && opp.stage === "Lost";

            return (
              <div key={stage} className="flex min-w-0 flex-1 items-center">
                <button
                  disabled={isClosed || stage === "Won" || stage === "Lost"}
                  onClick={() => {
                    if (!isClosed && stage !== "Won" && stage !== "Lost") {
                      updateOpportunityStage(opp.id, stage);
                    }
                  }}
                  className={cn(
                    "flex min-w-[72px] flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs transition-colors",
                    isCurrent && !isWon && !isLost
                      ? "bg-ember/10 ring-1 ring-ember/40"
                      : isWon
                        ? "bg-success/10 ring-1 ring-success/40"
                        : isLost
                          ? "bg-destructive/10 ring-1 ring-destructive/30"
                          : isPast
                            ? "cursor-pointer hover:bg-surface-muted"
                            : "opacity-40",
                  )}
                >
                  <StageBadge stage={stage} />
                </button>
                {idx < OPPORTUNITY_STAGES.length - 1 && (
                  <div
                    className={cn(
                      "mx-1 h-px w-3 shrink-0",
                      isPast || isWon ? "bg-success/40" : "bg-border",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Quick stage advance for open deals */}
        {!isClosed && currentIdx < openStages.length - 1 && (
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateOpportunityStage(opp.id, openStages[currentIdx + 1]!)}
            >
              Advance to {openStages[currentIdx + 1]} <ArrowRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {isClosed && (
        <div
          className={cn(
            "mb-5 rounded-xl border p-4 text-sm font-medium",
            opp.stage === "Won"
              ? "border-success/30 bg-success/5 text-success"
              : "border-destructive/25 bg-destructive/5 text-destructive",
          )}
        >
          {opp.stage === "Won" ? "🎉 Deal won" : "Deal lost"} · {formatDate(opp.closed_at)} ·{" "}
          {formatCurrency(opp.amount)}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5">
          <Panel title="Deal details">
            <div className="divide-y divide-border">
              <DetailRow label="Stage" value={<StageBadge stage={opp.stage} />} />
              <DetailRow
                label="Amount"
                value={
                  <span className="font-display font-semibold">
                    {opp.amount_high && opp.amount_high > opp.amount
                      ? `${formatCurrency(opp.amount_low ?? opp.amount)} – ${formatCurrency(opp.amount_high)}`
                      : formatCurrency(opp.amount)}
                  </span>
                }
              />
              <DetailRow label="Base licensing amount" value={formatCurrency(opp.amount)} />
              <DetailRow
                label="Machines"
                value={`${opp.boba_machine_qty} Boba · ${opp.ramen_machine_qty} Ramen`}
              />
              <DetailRow label="Probability" value={`${opp.probability}%`} />
              <DetailRow
                label="Weighted value"
                value={formatCurrency((opp.amount * opp.probability) / 100)}
              />
              <DetailRow label="Close date" value={formatShortDate(opp.expected_close_date)} />
              <DetailRow label="Time to close" value={relativeDay(opp.expected_close_date)} />
              <DetailRow label="Owner" value={userName(db, opp.owner_user_id)} />
              <DetailRow label="Region" value={opp.region} />
              <DetailRow label="Created" value={formatDate(opp.created_at)} />
            </div>
          </Panel>

          <Panel title="Related records">
            <div className="divide-y divide-border">
              <DetailRow
                label="Account"
                value={
                  <Link
                    to="/accounts/$accountId"
                    params={{ accountId: opp.account_id }}
                    className="font-medium hover:text-ember hover:underline"
                  >
                    {accountName(db, opp.account_id)}
                  </Link>
                }
              />
              {opp.primary_contact_id && (
                <DetailRow
                  label="Primary contact"
                  value={contactName(db, opp.primary_contact_id)}
                />
              )}
              {opp.originating_lead_id && (
                <DetailRow
                  label="Originating lead"
                  value={
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: opp.originating_lead_id }}
                      className="hover:text-ember hover:underline"
                    >
                      View lead
                    </Link>
                  }
                />
              )}
            </div>
          </Panel>

          {opp.next_action && (
            <Panel title="Next action">
              <p className="text-sm">{opp.next_action}</p>
            </Panel>
          )}
        </div>

        {/* Right 2 columns */}
        <div className="space-y-5 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Amount" value={formatCurrency(opp.amount)} tone="success" />
            <StatCard label="Probability" value={`${opp.probability}%`} />
            <StatCard
              label="Open tasks"
              value={openTasks.length}
              tone={openTasks.length > 2 ? "warning" : "default"}
            />
          </div>

          <Panel
            title="Open follow-ups"
            bodyClassName="p-4 pt-1"
            actions={<span className="text-xs text-muted-foreground">{openTasks.length}</span>}
          >
            <TaskList tasks={openTasks} emptyLabel="No open tasks." />
          </Panel>

          <Panel
            title="Activity timeline"
            actions={
              <LogInteractionDialog
                trigger={
                  <Button size="sm" variant="outline">
                    Log interaction
                  </Button>
                }
                related={{
                  opportunityId,
                  accountId: opp.account_id,
                  contactId: opp.primary_contact_id,
                }}
              />
            }
          >
            <InteractionTimeline
              interactions={interactions}
              showLinks={false}
              emptyLabel="No interactions logged yet."
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
