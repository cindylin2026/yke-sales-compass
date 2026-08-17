import { cn } from "@/lib/utils";
import type {
  AccountStatus,
  InteractionType,
  LeadLifecycleStage,
  OpportunityStage,
  TaskType,
} from "@/lib/crm/types";

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

const stageStyles: Record<LeadLifecycleStage, string> = {
  New: "border-border bg-surface-muted text-muted-foreground",
  MQL: "border-info/30 bg-info/10 text-info",
  SAL: "border-ember/30 bg-ember/10 text-ember",
  SQL: "border-warning/40 bg-warning/15 text-warning-foreground",
  Converted: "border-success/30 bg-success/12 text-success",
  Disqualified: "border-destructive/25 bg-destructive/10 text-destructive",
};

export function LifecycleBadge({ stage, className }: { stage: LeadLifecycleStage; className?: string }) {
  return <span className={cn(base, stageStyles[stage], className)}>{stage}</span>;
}

const oppStyles: Record<OpportunityStage, string> = {
  Discovery: "border-info/30 bg-info/10 text-info",
  Proposal: "border-ember/30 bg-ember/10 text-ember",
  Negotiation: "border-warning/40 bg-warning/15 text-warning-foreground",
  Won: "border-success/30 bg-success/12 text-success",
  Lost: "border-destructive/25 bg-destructive/10 text-destructive",
};

export function StageBadge({ stage, className }: { stage: OpportunityStage; className?: string }) {
  return <span className={cn(base, oppStyles[stage], className)}>{stage}</span>;
}

const accountStyles: Record<AccountStatus, string> = {
  Target: "border-border bg-surface-muted text-muted-foreground",
  "Active Prospect": "border-info/30 bg-info/10 text-info",
  Customer: "border-success/30 bg-success/12 text-success",
  "On Hold": "border-warning/40 bg-warning/15 text-warning-foreground",
  Churned: "border-destructive/25 bg-destructive/10 text-destructive",
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <span className={cn(base, accountStyles[status])}>{status}</span>;
}

export function TypeBadge({ type }: { type: InteractionType | TaskType | string }) {
  return <span className={cn(base, "border-border bg-surface-muted text-muted-foreground")}>{type}</span>;
}

export function SourceBadge({ source }: { source: string }) {
  return (
    <span className={cn(base, "border-accent bg-accent text-accent-foreground")}>{source}</span>
  );
}

/**
 * Lead Score — "how actionable is THIS prospect?"
 * Rendered as a pill so it never gets confused with Account Fit Score.
 */
export function LeadScore({ value, className }: { value: number; className?: string }) {
  const tone =
    value >= 75 ? "bg-success/12 text-success border-success/30" : value >= 50 ? "bg-warning/15 text-warning-foreground border-warning/40" : "bg-surface-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-display text-xs font-semibold tabular-nums",
        tone,
        className,
      )}
      title="Lead Score — how qualified and actionable this prospect is"
    >
      <span className="text-[10px] font-medium tracking-wide uppercase opacity-70">Lead</span>
      {value}
    </span>
  );
}

/**
 * Account Fit Score — "how attractive is this COMPANY as a target account?"
 * Deliberately a ring gauge so it reads differently from Lead Score.
 */
export function FitScore({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "lg" ? 72 : size === "md" ? 48 : 36;
  const stroke = size === "lg" ? 7 : size === "md" ? 5 : 4;
  const r = (dims - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color =
    value >= 85 ? "var(--success)" : value >= 70 ? "var(--ember)" : value >= 55 ? "var(--warning)" : "var(--muted-foreground)";
  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: dims, height: dims }}
      title="Account Fit Score — how well this company matches YKE's ideal customer profile"
    >
      <svg width={dims} height={dims} className="-rotate-90">
        <circle cx={dims / 2} cy={dims / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={dims / 2}
          cy={dims / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`}
        />
      </svg>
      <span
        className={cn(
          "absolute font-display font-semibold tabular-nums",
          size === "lg" ? "text-xl" : size === "md" ? "text-sm" : "text-[11px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function PriorityDot({ priority }: { priority: "Low" | "Normal" | "High" }) {
  const tone =
    priority === "High" ? "bg-destructive" : priority === "Normal" ? "bg-info" : "bg-muted-foreground/50";
  return <span className={cn("inline-block size-2 rounded-full", tone)} title={`${priority} priority`} />;
}
