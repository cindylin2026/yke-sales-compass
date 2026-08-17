/**
 * DataStateWrapper — shows loading skeleton or error banner while
 * the Supabase snapshot is fetching. Drop it at the top of any page.
 */
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrm } from "@/lib/crm/provider";
import { useQueryClient } from "@tanstack/react-query";
import { CRM_QUERY_KEY } from "@/lib/crm/provider";
import type { ReactNode } from "react";

export function DataStateWrapper({ children }: { children: ReactNode }) {
  const { isLoading, isError } = useCrm();
  const qc = useQueryClient();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 className="mb-3 size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading data…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <WifiOff className="mb-3 size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Could not connect to Supabase</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Check your internet connection and Supabase project status.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={() => void qc.invalidateQueries({ queryKey: CRM_QUERY_KEY })}
        >
          <RefreshCw className="size-3.5" /> Retry
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

/** Inline loading spinner for mutation-in-progress states */
export function InlineLoader({ label = "Saving…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}
