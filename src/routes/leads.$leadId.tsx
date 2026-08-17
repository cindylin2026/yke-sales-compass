import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDot, Clock, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel, DetailRow, EmptyState, StatCard } from "@/components/crm/ui-bits";
import { LifecycleBadge, LeadScore, SourceBadge, TypeBadge } from "@/components/crm/badges";
import { InteractionTimeline } from "@/components/crm/InteractionTimeline";
import { TaskList } from "@/components/crm/TaskList";
import { LogInteractionDialog } from "@/components/crm/LogInteractionDialog";
import { ConvertLeadDialog } from "@/components/crm/ConvertLeadDialog";
import { useCrm } from "@/lib/crm/provider";
import {
  formatDate,
  formatShortDate,
  leadName,
  relatedInteractions,
  relatedTasks,
  relativeDay,
  userName,
  accountName,
} from "@/lib/crm/selectors";
import { LEAD_STAGES, type LeadLifecycleStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leads/$leadId")({
  head: () => ({
    meta: [{ title: "Lead Detail — Yo-Kai Express Sales OS" }],
  }),
  component: LeadDetailPage,
});

const STAGE_ORDER: LeadLifecycleStage[] = ["New", "MQL", "SAL", "SQL", "Converted"];

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const { db, currentUser, updateLeadStage } = useCrm();
  const navigate = useNavigate();

  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/leads">Back to leads</Link>
        </Button>
      </div>
    );
  }

  const interactions = relatedInteractions(db.interactions, { leadId: lead.id });
  const tasks = relatedTasks(db.tasks, { leadId: lead.id });
  const openTasks = tasks.filter((t) => t.status === "Open");
  const currentStageIdx = STAGE_ORDER.indexOf(lead.lifecycle_stage as LeadLifecycleStage);
  const isConverted = lead.lifecycle_stage === "Converted";
  const isDisqualified = lead.lifecycle_stage === "Disqualified";

  const canAdvance =
    !isConverted &&
    !isDisqualified &&
    currentStageIdx < STAGE_ORDER.length - 2; // -2 because "Converted" is handled by dialog

  const nextStage = canAdvance ? STAGE_ORDER[currentStageIdx + 1] : null;

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/leads">
            <ArrowLeft className="size-4" /> All leads
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow={`Lead · ${lead.region} · ${lead.source}`}
        title={leadName(lead)}
        description={`${lead.title ?? ""}${lead.title ? " · " : ""}${lead.company_name}`}
        actions={
          <>
            {!isConverted && !isDisqualified && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateLeadStage(lead.id, "Disqualified", "Marked disqualified")}
              >
                Disqualify
              </Button>
            )}
            {canAdvance && nextStage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateLeadStage(lead.id, nextStage)}
              >
                Move to {nextStage} <ArrowRight className="size-4" />
              </Button>
            )}
            {!isConverted && !isDisqualified && lead.lifecycle_stage === "SQL" && (
              <ConvertLeadDialog
                lead={lead}
                trigger={
                  <Button size="sm">
                    Convert lead <ArrowRight className="size-4" />
                  </Button>
                }
              />
            )}
            {!isConverted && !isDisqualified && lead.lifecycle_stage !== "SQL" && (
              <ConvertLeadDialog
                lead={lead}
                trigger={
                  <Button variant="outline" size="sm">
                    Convert early
                  </Button>
                }
              />
            )}
            <LogInteractionDialog
              trigger={<Button size="sm">Log interaction</Button>}
              related={{ leadId: lead.id }}
            />
          </>
        }
      />

      {/* Lifecycle stepper */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGE_ORDER.map((stage, idx) => {
            const reached = lead.lifecycle_history.some((h) => h.stage === stage);
            const isCurrent =
              lead.lifecycle_stage === stage ||
              (stage === "Converted" && isConverted);
            const isPast = reached && !isCurrent;
            const historyEntry = lead.lifecycle_history.find((h) => h.stage === stage);

            return (
              <div key={stage} className="flex min-w-0 flex-1 items-center">
                <button
                  disabled={
                    isConverted ||
                    isDisqualified ||
                    stage === "Converted" ||
                    idx > currentStageIdx + 1
                  }
                  onClick={() => {
                    if (!isConverted && !isDisqualified && idx <= currentStageIdx + 1 && stage !== "Converted") {
                      updateLeadStage(lead.id, stage);
                    }
                  }}
                  className={cn(
                    "flex min-w-[80px] flex-1 flex-col items-center gap-1.5 rounded-lg p-2.5 text-center text-xs transition-colors",
                    isCurrent
                      ? "bg-ember/10 ring-1 ring-ember/40"
                      : isPast
                        ? "cursor-pointer hover:bg-surface-muted"
                        : idx === currentStageIdx + 1 && stage !== "Converted"
                          ? "cursor-pointer opacity-70 hover:bg-surface-muted"
                          : "opacity-40",
                  )}
                  title={historyEntry ? `${formatDate(historyEntry.changed_at)} · ${userName(db, historyEntry.changed_by_user_id)}` : undefined}
                >
                  {isPast ? (
                    <CheckCircle2 className="size-5 text-success" />
                  ) : isCurrent ? (
                    <CircleDot className="size-5 text-ember" />
                  ) : (
                    <Clock className="size-5 text-muted-foreground/40" />
                  )}
                  <span className={cn("font-medium", isCurrent ? "text-ember" : isPast ? "text-foreground" : "text-muted-foreground")}>
                    {stage}
                  </span>
                  {historyEntry ? (
                    <span className="text-[10px] text-muted-foreground">{formatShortDate(historyEntry.changed_at)}</span>
                  ) : null}
                </button>
                {idx < STAGE_ORDER.length - 1 && (
                  <div className={cn("mx-1 h-px w-4 shrink-0", isPast ? "bg-success/50" : "bg-border")} />
                )}
              </div>
            );
          })}
          {isDisqualified && (
            <div className="ml-2 flex flex-col items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2.5 ring-1 ring-destructive/30">
              <span className="text-xs font-medium text-destructive">Disqualified</span>
            </div>
          )}
        </div>
      </div>

      {isConverted && (
        <div className="mb-5 rounded-xl border border-success/30 bg-success/5 p-4">
          <p className="text-sm font-medium text-success">
            This lead was converted on {formatDate(lead.converted_at)}.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {lead.converted_account_id && (
              <Link
                to="/accounts/$accountId"
                params={{ accountId: lead.converted_account_id }}
                className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 hover:text-ember hover:underline"
              >
                → {accountName(db, lead.converted_account_id)}
              </Link>
            )}
            {lead.converted_opportunity_id && (
              <Link
                to="/opportunities/$opportunityId"
                params={{ opportunityId: lead.converted_opportunity_id }}
                className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 hover:text-ember hover:underline"
              >
                → Opportunity
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column — details */}
        <div className="space-y-5">
          <Panel title="Lead details">
            <div className="divide-y divide-border">
              <DetailRow label="Stage" value={<LifecycleBadge stage={lead.lifecycle_stage} />} />
              <DetailRow label="Lead Score" value={<LeadScore value={lead.lead_score} />} />
              <DetailRow label="Source" value={<SourceBadge source={lead.source} />} />
              {lead.source_detail && (
                <DetailRow label="Source detail" value={lead.source_detail} />
              )}
              <DetailRow label="Owner" value={userName(db, lead.owner_user_id)} />
              <DetailRow label="Region" value={lead.region} />
              <DetailRow
                label="Created"
                value={formatDate(lead.created_at)}
              />
              <DetailRow
                label="Last contacted"
                value={lead.last_contacted_at ? relativeDay(lead.last_contacted_at) : "Never"}
              />
            </div>
          </Panel>

          <Panel title="Contact info">
            <div className="space-y-2">
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
              >
                <Mail className="size-4 text-muted-foreground" />
                {lead.email}
              </a>
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-muted"
                >
                  <Phone className="size-4 text-muted-foreground" />
                  {lead.phone}
                </a>
              )}
            </div>
            <div className="mt-3 divide-y divide-border">
              <DetailRow label="Company" value={lead.company_name} />
              {lead.company_domain && (
                <DetailRow
                  label="Domain"
                  value={
                    <a
                      href={`https://${lead.company_domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-info hover:underline"
                    >
                      {lead.company_domain}
                    </a>
                  }
                />
              )}
              {lead.title && <DetailRow label="Title" value={lead.title} />}
            </div>
          </Panel>

          {lead.notes && (
            <Panel title="Notes">
              <p className="text-sm text-muted-foreground whitespace-pre-line">{lead.notes}</p>
            </Panel>
          )}

          <Panel title="Lifecycle history">
            {lead.lifecycle_history.length ? (
              <ol className="space-y-3">
                {[...lead.lifecycle_history].reverse().map((h, i) => (
                  <li key={i} className="flex gap-3 text-xs">
                    <LifecycleBadge stage={h.stage} />
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground">{formatDate(h.changed_at)}</p>
                      {h.note && <p className="mt-0.5 italic text-muted-foreground">{h.note}</p>}
                    </div>
                    <span className="shrink-0 text-muted-foreground">{userName(db, h.changed_by_user_id)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState>No history yet.</EmptyState>
            )}
          </Panel>
        </div>

        {/* Right column — activity */}
        <div className="space-y-5 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Interactions" value={interactions.length} hint="All logged activity" />
            <StatCard label="Open tasks" value={openTasks.length} hint="Pending follow-ups" tone={openTasks.length > 3 ? "warning" : "default"} />
            <StatCard label="Lead score" value={lead.lead_score} hint="Qualification signal" tone={lead.lead_score >= 70 ? "success" : lead.lead_score >= 50 ? "warning" : "default"} />
          </div>

          <Panel
            title="Open tasks"
            bodyClassName="p-4 pt-1"
            actions={
              <span className="text-xs text-muted-foreground">{openTasks.length} open</span>
            }
          >
            <TaskList tasks={openTasks} emptyLabel="No open tasks — log an interaction to create one." />
          </Panel>

          <Panel
            title="Interaction timeline"
            actions={
              <LogInteractionDialog
                trigger={
                  <Button size="sm" variant="outline">
                    Log interaction
                  </Button>
                }
                related={{ leadId: lead.id }}
              />
            }
          >
            <InteractionTimeline
              interactions={interactions}
              showLinks={false}
              emptyLabel="No interactions logged yet. Use the button above to log the first one."
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
