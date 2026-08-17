/**
 * CrmProvider — replaces in-memory state with Supabase + TanStack Query.
 *
 * Strategy:
 *  - A single "snapshot" query fetches all tables at once (matches existing
 *    CrmDatabase shape so every selector and page works unchanged).
 *  - Mutations call the Supabase repository then invalidate the snapshot query,
 *    triggering a re-fetch. This keeps the data flow simple and consistent.
 *  - Optimistic updates are added only where latency would hurt UX
 *    (task complete/reopen, lead stage advance).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createSeedDatabase } from "./seed";
import type {
  ConvertLeadInput,
  ConvertLeadResult,
  CrmDatabase,
  ID,
  Interaction,
  Lead,
  LeadLifecycleStage,
  Opportunity,
  Task,
  User,
} from "./types";
import {
  fetchSnapshot,
  dbUpdateLeadStage,
  dbAssignLead,
  dbCreateLead,
  dbConvertLead,
  dbCreateOpportunity,
  dbUpdateOpportunityStage,
  dbCreateInteraction,
  dbRequestAiSummary,
  dbCreateTask,
  dbCompleteTask,
  dbReopenTask,
} from "@/lib/supabase/repository";
import { useAuth } from "@/lib/auth/context";

export const CRM_QUERY_KEY = ["crm-snapshot"] as const;

// ── Fallback to seed data when not authenticated / Supabase not connected ──
const SEED_DB = createSeedDatabase();

interface CrmContextValue {
  db: CrmDatabase;
  currentUser: User;
  isLoading: boolean;
  isError: boolean;
  setCurrentUserId: (id: ID) => void; // kept for dev/demo switching

  updateLeadStage: (leadId: ID, stage: LeadLifecycleStage, note?: string) => void;
  assignLead: (leadId: ID, ownerUserId: ID | null) => void;
  createLead: (lead: Omit<Lead, "id" | "created_at" | "lifecycle_history">) => Promise<Lead>;
  convertLead: (input: ConvertLeadInput) => Promise<ConvertLeadResult>;

  createOpportunity: (opp: Omit<Opportunity, "id" | "created_at">) => Promise<Opportunity>;
  updateOpportunityStage: (oppId: ID, stage: Opportunity["stage"]) => void;

  createInteraction: (interaction: Omit<Interaction, "id" | "created_at">) => Promise<Interaction>;
  requestAiSummary: (interactionId: ID) => void;

  createTask: (task: Omit<Task, "id" | "created_at">) => Promise<Task>;
  completeTask: (taskId: ID) => void;
  reopenTask: (taskId: ID) => void;
}

const CrmContext = createContext<CrmContextValue | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const { profile, session } = useAuth();
  const qc = useQueryClient();

  const isAuthenticated = !!session;

  // ── Snapshot query ────────────────────────────────────────
  const { data: liveDb, isLoading, isError } = useQuery({
    queryKey: CRM_QUERY_KEY,
    queryFn: fetchSnapshot,
    enabled: isAuthenticated,
    staleTime: 30_000, // 30s — re-fetch on window focus after this
    retry: 1,
    // While loading or unauthenticated, fall through to SEED_DB below
  });

  const db: CrmDatabase = liveDb ?? SEED_DB;

  // Current user from auth profile, falling back to seed user for demo
  const currentUser: User = useMemo(
    () => profile ?? (db.users[0] as User),
    [profile, db.users],
  );

  const invalidate = useCallback(
    () => void qc.invalidateQueries({ queryKey: CRM_QUERY_KEY }),
    [qc],
  );

  // ── setCurrentUserId kept for dev demo ────────────────────
  const setCurrentUserId = useCallback((_id: ID) => {
    // No-op in production — user is determined by auth session
  }, []);

  // ── Lead mutations ────────────────────────────────────────
  const updateLeadStage = useCallback(
    (leadId: ID, stage: LeadLifecycleStage, note?: string) => {
      // Optimistic: update local cache immediately
      qc.setQueryData<CrmDatabase>(CRM_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          leads: old.leads.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  lifecycle_stage: stage,
                  lifecycle_history: [
                    ...l.lifecycle_history,
                    { stage, changed_at: new Date().toISOString(), changed_by_user_id: currentUser.id, note },
                  ],
                }
              : l,
          ),
        };
      });
      dbUpdateLeadStage(leadId, stage, note).catch((e: Error) => {
        toast.error("Failed to update stage", { description: e.message });
        invalidate();
      });
    },
    [qc, currentUser.id, invalidate],
  );

  const assignLead = useCallback(
    (leadId: ID, ownerUserId: ID | null) => {
      qc.setQueryData<CrmDatabase>(CRM_QUERY_KEY, (old) => {
        if (!old) return old;
        return { ...old, leads: old.leads.map((l) => l.id === leadId ? { ...l, owner_user_id: ownerUserId } : l) };
      });
      dbAssignLead(leadId, ownerUserId).catch((e: Error) => {
        toast.error("Failed to assign lead", { description: e.message });
        invalidate();
      });
    },
    [qc, invalidate],
  );

  const createLead = useCallback(
    async (lead: Omit<Lead, "id" | "created_at" | "lifecycle_history">): Promise<Lead> => {
      const created = await dbCreateLead(lead);
      invalidate();
      return created;
    },
    [invalidate],
  );

  const convertLead = useCallback(
    async (input: ConvertLeadInput): Promise<ConvertLeadResult> => {
      const result = await dbConvertLead(input);
      invalidate();
      return result;
    },
    [invalidate],
  );

  // ── Opportunity mutations ──────────────────────────────────
  const createOpportunity = useCallback(
    async (opp: Omit<Opportunity, "id" | "created_at">): Promise<Opportunity> => {
      const created = await dbCreateOpportunity(opp);
      invalidate();
      return created;
    },
    [invalidate],
  );

  const updateOpportunityStage = useCallback(
    (oppId: ID, stage: Opportunity["stage"]) => {
      qc.setQueryData<CrmDatabase>(CRM_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          opportunities: old.opportunities.map((o) =>
            o.id === oppId
              ? {
                  ...o,
                  stage,
                  probability: stage === "Won" ? 100 : stage === "Lost" ? 0 : o.probability,
                  closed_at: stage === "Won" || stage === "Lost" ? new Date().toISOString() : null,
                }
              : o,
          ),
        };
      });
      dbUpdateOpportunityStage(oppId, stage).catch((e: Error) => {
        toast.error("Failed to update opportunity stage", { description: e.message });
        invalidate();
      });
    },
    [qc, invalidate],
  );

  // ── Interaction mutations ──────────────────────────────────
  const createInteraction = useCallback(
    async (interaction: Omit<Interaction, "id" | "created_at">): Promise<Interaction> => {
      const created = await dbCreateInteraction(interaction);
      invalidate();
      return created;
    },
    [invalidate],
  );

  const requestAiSummary = useCallback(
    (interactionId: ID) => {
      qc.setQueryData<CrmDatabase>(CRM_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          interactions: old.interactions.map((i) =>
            i.id === interactionId ? { ...i, ai_summary_status: "pending" as const } : i,
          ),
        };
      });
      dbRequestAiSummary(interactionId).catch(console.error);
    },
    [qc],
  );

  // ── Task mutations ────────────────────────────────────────
  const createTask = useCallback(
    async (task: Omit<Task, "id" | "created_at">): Promise<Task> => {
      const created = await dbCreateTask(task);
      invalidate();
      return created;
    },
    [invalidate],
  );

  const completeTask = useCallback(
    (taskId: ID) => {
      qc.setQueryData<CrmDatabase>(CRM_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === taskId
              ? { ...t, status: "Completed" as const, completed_at: new Date().toISOString() }
              : t,
          ),
        };
      });
      dbCompleteTask(taskId).catch((e: Error) => {
        toast.error("Failed to complete task", { description: e.message });
        invalidate();
      });
    },
    [qc, invalidate],
  );

  const reopenTask = useCallback(
    (taskId: ID) => {
      qc.setQueryData<CrmDatabase>(CRM_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === taskId ? { ...t, status: "Open" as const, completed_at: undefined } : t,
          ),
        };
      });
      dbReopenTask(taskId).catch((e: Error) => {
        toast.error("Failed to reopen task", { description: e.message });
        invalidate();
      });
    },
    [qc, invalidate],
  );

  const value = useMemo<CrmContextValue>(
    () => ({
      db,
      currentUser,
      isLoading,
      isError,
      setCurrentUserId,
      updateLeadStage,
      assignLead,
      createLead,
      convertLead,
      createOpportunity,
      updateOpportunityStage,
      createInteraction,
      requestAiSummary,
      createTask,
      completeTask,
      reopenTask,
    }),
    [
      db, currentUser, isLoading, isError, setCurrentUserId,
      updateLeadStage, assignLead, createLead, convertLead,
      createOpportunity, updateOpportunityStage,
      createInteraction, requestAiSummary,
      createTask, completeTask, reopenTask,
    ],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm(): CrmContextValue {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used inside <CrmProvider>");
  return ctx;
}
