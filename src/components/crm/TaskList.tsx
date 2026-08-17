import { Link } from "@tanstack/react-router";
import { Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityDot, TypeBadge } from "@/components/crm/badges";
import { EmptyState } from "@/components/crm/ui-bits";
import { useCrm } from "@/lib/crm/provider";
import { accountName, formatShortDate, relativeDay, userName } from "@/lib/crm/selectors";
import type { Task } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

function RelatedLink({ task }: { task: Task }) {
  const { db } = useCrm();
  if (task.lead_id) {
    const lead = db.leads.find((l) => l.id === task.lead_id);
    return (
      <Link to="/leads/$leadId" params={{ leadId: task.lead_id }} className="hover:text-ember hover:underline">
        Lead · {lead ? `${lead.first_name} ${lead.last_name}` : task.lead_id}
      </Link>
    );
  }
  if (task.account_id) {
    return (
      <Link
        to="/accounts/$accountId"
        params={{ accountId: task.account_id }}
        className="hover:text-ember hover:underline"
      >
        {accountName(db, task.account_id)}
      </Link>
    );
  }
  return <span>—</span>;
}

export function TaskList({
  tasks,
  emptyLabel = "Nothing here. Clear queue.",
  showOwner = false,
  dense = false,
}: {
  tasks: Task[];
  emptyLabel?: string;
  showOwner?: boolean;
  dense?: boolean;
}) {
  const { db, completeTask, reopenTask } = useCrm();
  if (!tasks.length) return <EmptyState>{emptyLabel}</EmptyState>;

  return (
    <ul className="divide-y divide-border">
      {tasks.map((task) => {
        const done = task.status === "Completed";
        return (
          <li
            key={task.id}
            className={cn("flex items-start gap-3", dense ? "py-2" : "py-3", done && "opacity-60")}
          >
            <Button
              size="icon"
              variant={done ? "secondary" : "outline"}
              className="mt-0.5 size-7 shrink-0 rounded-full"
              onClick={() => (done ? reopenTask(task.id) : completeTask(task.id))}
              aria-label={done ? "Reopen task" : "Complete task"}
            >
              {done ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />}
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityDot priority={task.priority} />
                <p className={cn("text-sm font-medium", done && "line-through")}>{task.title}</p>
                <TypeBadge type={task.type} />
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <RelatedLink task={task} />
                <span>·</span>
                <span>{task.next_action ?? "No next action"}</span>
                {showOwner ? (
                  <>
                    <span>·</span>
                    <span>{userName(db, task.owner_user_id)}</span>
                  </>
                ) : null}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium">{formatShortDate(task.due_date)}</p>
              <p
                className={cn(
                  "text-[11px]",
                  !done && task.due_date < new Date().toISOString().slice(0, 10)
                    ? "font-medium text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {done ? "Completed" : relativeDay(task.due_date)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
