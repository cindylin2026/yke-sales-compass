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
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createSeedDatabase } from "./seed";
import type {
  Account,
  Contact,
  ConvertLeadInput,
  ConvertLeadResult,
  CrmDatabase,
  DisqualifyReason,
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
  dbCompleteOpenTasksFor,
  dbAssignLead,
  dbCreateAccount,
  dbUpdateAccount,
  dbCreateContact,
  dbUpdateLeadFitCriteria,
  dbUpdateLeadDetails,
  dbUpdateContact,
  dbCreateLead,
  dbConvertLead,
  dbCreateOpportunity,
  dbUpdateOpportunityStage,
  dbCreateInteraction,
  dbRequestAiSummary,
  dbCreateTask,
  dbCompleteTask,
  dbReopenTask,
  dbRescheduleTask,
  dbUpdateProfile,
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

  updateLeadStage: (
    leadId: ID,
    stage: LeadLifecycleStage,
    note?: string,
    disqualifyReason?: DisqualifyReason,
  ) => void;
  assignLead: (leadId: ID, ownerUserId: ID | null) => void;
  updateLeadFitCriteria: (
    leadId: ID,
    criteria: Pick<
      Lead,
      | "foot_traffic_score"
      | "utility_readiness_score"
      | "brand_alignment_score"
      | "contract_complexity_score"
      | "decision_maker_accessibility_score"
      | "expansion_potential_score"
    >,
  ) => Promise<void>;
  createLead: (lead: Omit<Lead, "id" | "created_at" | "lifecycle_history">) => Promise<Lead>;
  updateLeadDetails: (
    leadId: ID,
    patch: Partial<
      Pick<
        Lead,
        | "first_name"
        | "last_name"
        | "email"
        | "phone"
        | "title"
        | "company_name"
        | "company_domain"
        | "region"
        | "market"
        | "segment"
        | "source_detail"
        | "notes"
      >
    >,
  ) => Promise<void>;
  createAccount: (
    account: Omit<Account, "id" | "created_at" | "account_fit_score"> & {
      account_fit_score?: number;
    },
  ) => Promise<Account>;
  updateAccount: (
    accountId: ID,
    patch: Partial<
      Pick<
        Account,
        | "name"
        | "domain"
        | "segment"
        | "region"
        | "market"
        | "country"
        | "city"
        | "status"
        | "employee_count"
        | "locations_count"
        | "notes"
      >
    >,
  ) => Promise<void>;
  updateContact: (
    contactId: ID,
    patch: Partial<
      Pick<Contact, "first_name" | "last_name" | "title" | "email" | "phone" | "is_primary">
    >,
  ) => Promise<void>;
  createContact: (contact: Omit<Contact, "id" | "created_at">) => Promise<Contact>;
  convertLead: (input: ConvertLeadInput) => Promise<ConvertLeadResult>;

  createOpportunity: (opp: Omit<Opportunity, "id" | "created_at">) => Promise<Opportunity>;
  updateOpportunityStage: (oppId: ID, stage: Opportunity["stage"]) => void;

  createInteraction: (interaction: Omit<Interaction, "id" | "created_at">) => Promise<Interaction>;
  requestAiSummary: (interactionId: ID) => void;

  createTask: (task: Omit<Task, "id" | "created_at">) => Promise<Task>;
  completeTask: (taskId: ID) => void;
  reopenTask: (taskId: ID) => void;
  rescheduleTask: (taskId: ID, dueDate: string) => void;

  updateUserProfile: (
    userId: ID,
    patch: Partial<Pick<User, "role" | "region" | "title" | "active">>,
  ) => Promise<void>;
}

const CrmContext = createContext<CrmContextValue | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const { profile, session } = useAuth();
  const qc = useQueryClient();

  const isAuthenticated = !!session;

  // ── Snapshot query ────────────────────────────────────────
  const {
    data: liveDb,
    isLoading,
    isError,
  } = useQuery({
    queryKey: CRM_QUERY_KEY,
    queryFn: fetchSnapshot,
    enabled: isAuthenticated,
    staleTime: 30_000, // 30s — re-fetch on window focus after this
    retry: 1,
    // While loading or unauthenticated, fall through to SEED_DB below
  });

  const db: CrmDatabase = liveDb ?? SEED_DB;

  // Current user from auth profile, falling back to seed user for demo
  const currentUser: User = useMemo(() => profile ?? (db.users[0] as User), [profile, db.users]);

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
    (leadId: ID, stage: LeadLifecycleStage, note?: string, disqualifyReason?: DisqualifyReason) => {
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
                  disqualify_reason: stage === "Disqualified" ? disqualifyReason : null,
                  lifecycle_history: [
                    ...l.lifecycle_history,
                    {
                      stage,
                      changed_at: new Date().toISOString(),
                      changed_by_user_id: currentUser.id,
                      note,
                    },
                  ],
                }
              : l,
          ),
        };
      });
      dbUpdateLeadStage(leadId, stage, note, disqualifyReason)
        .then(() => dbCompleteOpenTasksFor({ leadId }))
        .then(invalidate)
        .catch((e: Error) => {
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
        return {
          ...old,
          leads: old.leads.map((l) => (l.id === leadId ? { ...l, owner_user_id: ownerUserId } : l)),
        };
      });
      dbAssignLead(leadId, ownerUserId).catch((e: Error) => {
        toast.error("Failed to assign lead", { description: e.message });
        invalidate();
      });
    },
    [qc, invalidate],
  );

  const updateLeadFitCriteria = useCallback(
    async (
      leadId: ID,
      criteria: Pick<
        Lead,
        | "foot_traffic_score"
        | "utility_readiness_score"
        | "brand_alignment_score"
        | "contract_complexity_score"
        | "decision_maker_accessibility_score"
        | "expansion_potential_score"
      >,
    ) => {
      await dbUpdateLeadFitCriteria(leadId, criteria);
      invalidate();
    },
    [invalidate],
  );

  const updateLeadDetails = useCallback(
    async (
      leadId: ID,
      patch: Partial<
        Pick<
          Lead,
          | "first_name"
          | "last_name"
          | "email"
          | "phone"
          | "title"
          | "company_name"
          | "company_domain"
          | "region"
          | "market"
          | "segment"
          | "source_detail"
          | "notes"
        >
      >,
    ) => {
      await dbUpdateLeadDetails(leadId, patch);
      invalidate();
    },
    [invalidate],
  );

  const updateAccount = useCallback(
    async (
      accountId: ID,
      patch: Partial<
        Pick<
          Account,
          | "name"
          | "domain"
          | "segment"
          | "region"
          | "market"
          | "country"
          | "city"
          | "status"
          | "employee_count"
          | "locations_count"
          | "notes"
        >
      >,
    ) => {
      await dbUpdateAccount(accountId, patch);
      invalidate();
    },
    [invalidate],
  );

  const updateContact = useCallback(
    async (
      contactId: ID,
      patch: Partial<
        Pick<Contact, "first_name" | "last_name" | "title" | "email" | "phone" | "is_primary">
      >,
    ) => {
      await dbUpdateContact(contactId, patch);
      invalidate();
    },
    [invalidate],
  );

  const createContact = useCallback(
    async (contact: Omit<Contact, "id" | "created_at">): Promise<Contact> => {
      const created = await dbCreateContact(contact);
      invalidate();
      return created;
    },
    [invalidate],
  );

  const createLead = useCallback(
    async (lead: Omit<Lead, "id" | "created_at" | "lifecycle_history">): Promise<Lead> => {
      const created = await dbCreateLead(lead);
      invalidate();
      return created;
    },
    [invalidate],
  );

  const createAccount = useCallback(
    async (
      account: Omit<Account, "id" | "created_at" | "account_fit_score"> & {
        account_fit_score?: number;
      },
    ): Promise<Account> => {
      const created = await dbCreateAccount(account);
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
      dbUpdateOpportunityStage(oppId, stage)
        .then(() => dbCompleteOpenTasksFor({ opportunityId: oppId }))
        .then(invalidate)
        .catch((e: Error) => {
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
      // Logging an interaction against an account/contact/lead/opportunity
      // is the action itself — auto-complete whatever open follow-up was
      // sitting on that same record so the rep doesn't have to check it
      // off by hand too.
      await dbCompleteOpenTasksFor({
        leadId: interaction.lead_id ?? undefined,
        accountId: interaction.account_id ?? undefined,
        contactId: interaction.contact_id ?? undefined,
        opportunityId: interaction.opportunity_id ?? undefined,
      });
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

  const rescheduleTask = useCallback(
    (taskId: ID, dueDate: string) => {
      qc.setQueryData<CrmDatabase>(CRM_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) => (t.id === taskId ? { ...t, due_date: dueDate } : t)),
        };
      });
      dbRescheduleTask(taskId, dueDate).catch((e: Error) => {
        toast.error("Failed to reschedule task", { description: e.message });
        invalidate();
      });
    },
    [qc, invalidate],
  );

  const updateUserProfile = useCallback(
    async (userId: ID, patch: Partial<Pick<User, "role" | "region" | "title" | "active">>) => {
      await dbUpdateProfile(userId, patch);
      invalidate();
    },
    [invalidate],
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
      updateLeadFitCriteria,
      updateLeadDetails,
      createLead,
      createAccount,
      updateAccount,
      updateContact,
      createContact,
      convertLead,
      createOpportunity,
      updateOpportunityStage,
      createInteraction,
      requestAiSummary,
      createTask,
      completeTask,
      reopenTask,
      rescheduleTask,
      updateUserProfile,
    }),
    [
      db,
      currentUser,
      isLoading,
      isError,
      setCurrentUserId,
      updateLeadStage,
      assignLead,
      updateLeadFitCriteria,
      updateLeadDetails,
      createLead,
      createAccount,
      updateAccount,
      updateContact,
      createContact,
      convertLead,
      createOpportunity,
      updateOpportunityStage,
      createInteraction,
      requestAiSummary,
      createTask,
      completeTask,
      reopenTask,
      rescheduleTask,
      updateUserProfile,
    ],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm(): CrmContextValue {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used inside <CrmProvider>");
  return ctx;
}
