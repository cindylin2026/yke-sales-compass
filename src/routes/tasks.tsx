import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, Panel, StatCard, EmptyState } from "@/components/crm/ui-bits";
import { TaskList } from "@/components/crm/TaskList";
import { useCrm } from "@/lib/crm/provider";
import { bucketTasks, scopeForUser } from "@/lib/crm/selectors";
import { TASK_TYPES, type TaskType } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [{ title: "Follow-ups — Yo-Kai Express Sales OS" }],
  }),
  component: TasksPage,
});

type Tab = "overdue" | "today" | "upcoming" | "completed";

function TasksPage() {
  const { db, currentUser } = useCrm();
  const [tab, setTab] = useState<Tab>("overdue");
  const [query, setQuery] = useState("");
  const [taskType, setTaskType] = useState<TaskType | "all">("all");
  const [owner, setOwner] = useState<string>(
    currentUser.role === "sales_rep" ? currentUser.id : "all",
  );
  const [priority, setPriority] = useState<string>("all");

  const scopedTasks = useMemo(() => {
    if (owner === "all") return db.tasks;
    return db.tasks.filter((t) => t.owner_user_id === owner);
  }, [db.tasks, owner]);

  const buckets = useMemo(() => bucketTasks(scopedTasks), [scopedTasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const src = {
      overdue: buckets.overdue,
      today: buckets.dueToday,
      upcoming: buckets.upcoming,
      completed: buckets.completed,
    }[tab];

    return src.filter((t) => {
      if (taskType !== "all" && t.type !== taskType) return false;
      if (priority !== "all" && t.priority !== priority) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [buckets, tab, query, taskType, priority]);

  const tabs: { id: Tab; label: string; count: number; tone?: string }[] = [
    {
      id: "overdue",
      label: "Overdue",
      count: buckets.overdue.length,
      tone: buckets.overdue.length ? "text-destructive" : "",
    },
    { id: "today", label: "Today", count: buckets.dueToday.length },
    { id: "upcoming", label: "Upcoming", count: buckets.upcoming.length },
    { id: "completed", label: "Completed", count: buckets.completed.length },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Follow-up queue"
        title="Follow-ups"
        description="Commitments you've made. Clear the overdue queue first, then today's tasks."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Overdue"
          value={buckets.overdue.length}
          tone={buckets.overdue.length ? "danger" : "default"}
          hint="Past due date"
        />
        <StatCard label="Due today" value={buckets.dueToday.length} tone="warning" />
        <StatCard label="Upcoming" value={buckets.upcoming.length} />
        <StatCard label="Completed" value={buckets.completed.length} tone="success" hint="All time" />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-surface-muted text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  tab === t.id
                    ? t.id === "overdue"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-ember/15 text-ember"
                    : "bg-border text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <Panel bodyClassName="p-0">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search tasks"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType | "all")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TASK_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          {(currentUser.role === "manager" || currentUser.role === "admin") && (
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
          )}
        </div>

        <div className="p-4">
          {filtered.length ? (
            <TaskList
              tasks={filtered}
              showOwner={owner === "all"}
              emptyLabel={`No ${tab} tasks.`}
            />
          ) : (
            <EmptyState>
              {tab === "overdue"
                ? "Nothing overdue. Strong work."
                : tab === "today"
                  ? "No tasks due today."
                  : tab === "upcoming"
                    ? "Nothing upcoming — consider scheduling next steps."
                    : "No completed tasks yet."}
            </EmptyState>
          )}
        </div>
      </Panel>
    </>
  );
}
