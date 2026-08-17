import { Link } from "@tanstack/react-router";
import { ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypeBadge } from "@/components/crm/badges";
import { EmptyState } from "@/components/crm/ui-bits";
import { useCrm } from "@/lib/crm/provider";
import { accountName, contactName, formatDate, formatShortDate, userName } from "@/lib/crm/selectors";
import type { Interaction } from "@/lib/crm/types";

export function InteractionTimeline({
  interactions,
  showLinks = true,
  emptyLabel = "No interactions logged yet.",
}: {
  interactions: Interaction[];
  showLinks?: boolean;
  emptyLabel?: string;
}) {
  const { db, requestAiSummary } = useCrm();
  if (!interactions.length) return <EmptyState>{emptyLabel}</EmptyState>;

  return (
    <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-border">
      {interactions.map((i) => (
        <li key={i.id} className="relative pl-6">
          <span className="absolute top-1.5 left-0 size-3.5 rounded-full border-2 border-surface bg-ember" />
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={i.type} />
            <p className="text-sm font-medium">{i.subject}</p>
            <span className="text-xs text-muted-foreground">
              {formatDate(i.occurred_at)} · {userName(db, i.owner_user_id)}
            </span>
          </div>

          {showLinks ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {i.account_id ? (
                <Link
                  to="/accounts/$accountId"
                  params={{ accountId: i.account_id }}
                  className="hover:text-ember hover:underline"
                >
                  {accountName(db, i.account_id)}
                </Link>
              ) : null}
              {i.contact_id ? <span>· {contactName(db, i.contact_id)}</span> : null}
              {i.lead_id ? (
                <Link
                  to="/leads/$leadId"
                  params={{ leadId: i.lead_id }}
                  className="hover:text-ember hover:underline"
                >
                  · Lead record
                </Link>
              ) : null}
              {i.opportunity_id ? (
                <Link
                  to="/opportunities/$opportunityId"
                  params={{ opportunityId: i.opportunity_id }}
                  className="hover:text-ember hover:underline"
                >
                  · Opportunity
                </Link>
              ) : null}
            </p>
          ) : null}

          {i.notes ? <p className="mt-1.5 text-sm text-muted-foreground">{i.notes}</p> : null}

          {i.source_doc_url ? (
            <div className="mt-2 rounded-lg border border-border bg-surface-muted p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a
                  href={i.source_doc_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-info hover:underline"
                >
                  <ExternalLink className="size-3.5" /> Meeting notes doc
                </a>
                {i.ai_summary_status !== "ready" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={i.ai_summary_status === "pending"}
                    onClick={() => requestAiSummary(i.id)}
                  >
                    <Sparkles className="size-3.5" />
                    {i.ai_summary_status === "pending" ? "Summarizing…" : "Summarize notes"}
                  </Button>
                ) : null}
              </div>
              {i.ai_summary ? (
                <p className="mt-2 border-l-2 border-ember/50 pl-2.5 text-xs text-muted-foreground italic">
                  {i.ai_summary}
                </p>
              ) : null}
            </div>
          ) : null}

          {i.next_steps || i.next_action ? (
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
              {i.next_steps ? (
                <span>
                  <span className="text-muted-foreground">Next steps: </span>
                  {i.next_steps}
                </span>
              ) : null}
              {i.next_action ? (
                <span>
                  <span className="text-muted-foreground">Next action: </span>
                  {i.next_action}
                  {i.next_action_due_date ? ` — due ${formatShortDate(i.next_action_due_date)}` : ""}
                </span>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
