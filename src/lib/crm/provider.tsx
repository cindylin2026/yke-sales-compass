import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createSeedDatabase } from "./seed";
import { newId, nowIso } from "./repository";
import type {
  Account,
  Contact,
  ConvertLeadInput,
  ConvertLeadResult,
  CrmDatabase,
  ID,
  Interaction,
  Lead,
  LeadLifecycleStage,
  Opportunity,
  OpportunityStage,
  Task,
  User,
} from "./types";

interface CrmContextValue {
  db: CrmDatabase;
  currentUser: User;
  setCurrentUserId: (id: ID) => void;

  updateLeadStage: (leadId: ID, stage: LeadLifecycleStage, note?: string) => void;
  assignLead: (leadId: ID, ownerUserId: ID | null) => void;
  createLead: (lead: Omit<Lead, "id" | "created_at" | "lifecycle_history">) => Lead;
  convertLead: (input: ConvertLeadInput) => ConvertLeadResult;

  createOpportunity: (opp: Omit<Opportunity, "id" | "created_at">) => Opportunity;
  updateOpportunityStage: (oppId: ID, stage: OpportunityStage) => void;

  createInteraction: (interaction: Omit<Interaction, "id" | "created_at">) => Interaction;
  requestAiSummary: (interactionId: ID) => void;

  createTask: (task: Omit<Task, "id" | "created_at">) => Task;
  completeTask: (taskId: ID) => void;
  reopenTask: (taskId: ID) => void;
}

const CrmContext = createContext<CrmContextValue | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<CrmDatabase>(() => createSeedDatabase());
  const [currentUserId, setCurrentUserId] = useState<ID>("usr_cindy");

  const currentUser = useMemo(
    () => db.users.find((u) => u.id === currentUserId) ?? db.users[0]!,
    [db.users, currentUserId],
  );

  const updateLeadStage = useCallback(
    (leadId: ID, stage: LeadLifecycleStage, note?: string) => {
      setDb((prev) => ({
        ...prev,
        leads: prev.leads.map((l) =>
          l.id === leadId
            ? {
                ...l,
                lifecycle_stage: stage,
                lifecycle_history: [
                  ...l.lifecycle_history,
                  {
                    stage,
                    changed_at: nowIso(),
                    changed_by_user_id: currentUserId,
                    ...(note ? { note } : {}),
                  },
                ],
              }
            : l,
        ),
      }));
    },
    [currentUserId],
  );

  const assignLead = useCallback((leadId: ID, ownerUserId: ID | null) => {
    setDb((prev) => ({
      ...prev,
      leads: prev.leads.map((l) => (l.id === leadId ? { ...l, owner_user_id: ownerUserId } : l)),
    }));
  }, []);

  const createLead = useCallback(
    (lead: Omit<Lead, "id" | "created_at" | "lifecycle_history">) => {
      const created: Lead = {
        ...lead,
        id: newId("lea"),
        created_at: nowIso(),
        lifecycle_history: [
          {
            stage: lead.lifecycle_stage,
            changed_at: nowIso(),
            changed_by_user_id: currentUserId,
            note: `Created from ${lead.source}`,
          },
        ],
      };
      setDb((prev) => ({ ...prev, leads: [created, ...prev.leads] }));
      return created;
    },
    [currentUserId],
  );

  const convertLead = useCallback(
    (input: ConvertLeadInput): ConvertLeadResult => {
      const stamp = nowIso();
      let result: ConvertLeadResult = {
        lead_id: input.lead_id,
        account_id: input.account_id ?? "",
        contact_id: input.contact_id ?? "",
        opportunity_id: null,
      };

      setDb((prev) => {
        const lead = prev.leads.find((l) => l.id === input.lead_id);
        if (!lead) return prev;

        let accounts = prev.accounts;
        let accountId = input.account_id;
        if (!accountId) {
          const na = input.new_account;
          const account: Account = {
            id: newId("acc"),
            name: na?.name ?? lead.company_name,
            domain: na?.domain ?? lead.company_domain,
            segment: na?.segment ?? "Office / Corporate",
            region: na?.region ?? lead.region,
            country: na?.country ?? (lead.region === "Asia" ? "Singapore" : "United States"),
            status: na?.status ?? "Active Prospect",
            account_fit_score: na?.account_fit_score ?? 60,
            owner_user_id: input.owner_user_id ?? lead.owner_user_id,
            created_at: stamp,
          };
          accounts = [account, ...prev.accounts];
          accountId = account.id;
        }

        let contacts = prev.contacts;
        let contactId = input.contact_id;
        if (!contactId && input.create_contact) {
          const contact: Contact = {
            id: newId("con"),
            account_id: accountId,
            first_name: lead.first_name,
            last_name: lead.last_name,
            title: lead.title,
            email: lead.email,
            phone: lead.phone,
            is_primary: !prev.contacts.some((c) => c.account_id === accountId),
            owner_user_id: input.owner_user_id ?? lead.owner_user_id,
            originating_lead_id: lead.id,
            created_at: stamp,
          };
          contacts = [contact, ...prev.contacts];
          contactId = contact.id;
        }

        let opportunities = prev.opportunities;
        let opportunityId: ID | null = null;
        if (input.create_opportunity && input.opportunity) {
          const opp: Opportunity = {
            id: newId("opp"),
            name: input.opportunity.name,
            account_id: accountId,
            primary_contact_id: contactId ?? null,
            owner_user_id: input.owner_user_id ?? lead.owner_user_id,
            stage: input.opportunity.stage,
            amount: input.opportunity.amount,
            probability: input.opportunity.probability,
            expected_close_date: input.opportunity.expected_close_date,
            next_action: input.opportunity.next_action,
            region: lead.region,
            originating_lead_id: lead.id,
            created_at: stamp,
            closed_at: null,
          };
          opportunities = [opp, ...prev.opportunities];
          opportunityId = opp.id;
        }

        // Reassign existing interactions/tasks from the lead onto the new records
        // so history follows the prospect instead of being orphaned.
        const interactions = prev.interactions.map((i) =>
          i.lead_id === lead.id
            ? { ...i, account_id: accountId, contact_id: contactId ?? i.contact_id }
            : i,
        );
        const tasks = prev.tasks.map((t) =>
          t.lead_id === lead.id
            ? { ...t, account_id: accountId, contact_id: contactId ?? t.contact_id }
            : t,
        );

        result = {
          lead_id: lead.id,
          account_id: accountId,
          contact_id: contactId ?? "",
          opportunity_id: opportunityId,
        };

        return {
          ...prev,
          accounts,
          contacts,
          opportunities,
          interactions,
          tasks,
          leads: prev.leads.map((l) =>
            l.id === lead.id
              ? {
                  ...l,
                  lifecycle_stage: "Converted" as LeadLifecycleStage,
                  converted_at: stamp,
                  converted_account_id: accountId,
                  converted_contact_id: contactId ?? null,
                  converted_opportunity_id: opportunityId,
                  lifecycle_history: [
                    ...l.lifecycle_history,
                    {
                      stage: "Converted" as LeadLifecycleStage,
                      changed_at: stamp,
                      changed_by_user_id: currentUserId,
                      note: opportunityId
                        ? "Converted to Account + Contact + Opportunity"
                        : "Converted to Account + Contact",
                    },
                  ],
                }
              : l,
          ),
        };
      });

      return result;
    },
    [currentUserId],
  );

  const createOpportunity = useCallback((opp: Omit<Opportunity, "id" | "created_at">) => {
    const created: Opportunity = { ...opp, id: newId("opp"), created_at: nowIso() };
    setDb((prev) => ({ ...prev, opportunities: [created, ...prev.opportunities] }));
    return created;
  }, []);

  const updateOpportunityStage = useCallback((oppId: ID, stage: OpportunityStage) => {
    setDb((prev) => ({
      ...prev,
      opportunities: prev.opportunities.map((o) =>
        o.id === oppId
          ? {
              ...o,
              stage,
              probability: stage === "Won" ? 100 : stage === "Lost" ? 0 : o.probability,
              closed_at: stage === "Won" || stage === "Lost" ? nowIso() : null,
            }
          : o,
      ),
    }));
  }, []);

  const createInteraction = useCallback((interaction: Omit<Interaction, "id" | "created_at">) => {
    const created: Interaction = { ...interaction, id: newId("int"), created_at: nowIso() };
    setDb((prev) => ({ ...prev, interactions: [created, ...prev.interactions] }));
    return created;
  }, []);

  /**
   * Placeholder for the future AI summarizer (Google Doc URL -> summary).
   * The workflow, states and UI are real; only the model call is pending.
   */
  const requestAiSummary = useCallback((interactionId: ID) => {
    setDb((prev) => ({
      ...prev,
      interactions: prev.interactions.map((i) =>
        i.id === interactionId ? { ...i, ai_summary_status: "pending" as const } : i,
      ),
    }));
    setTimeout(() => {
      setDb((prev) => ({
        ...prev,
        interactions: prev.interactions.map((i) =>
          i.id === interactionId
            ? {
                ...i,
                ai_summary_status: "ready" as const,
                ai_summary:
                  "AI summary placeholder — once the summarizer is connected, the linked meeting doc will be condensed into decisions, objections, and committed next steps here.",
              }
            : i,
        ),
      }));
    }, 1400);
  }, []);

  const createTask = useCallback((task: Omit<Task, "id" | "created_at">) => {
    const created: Task = { ...task, id: newId("tsk"), created_at: nowIso() };
    setDb((prev) => ({ ...prev, tasks: [created, ...prev.tasks] }));
    return created;
  }, []);

  const completeTask = useCallback((taskId: ID) => {
    setDb((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, status: "Completed" as const, completed_at: nowIso() } : t,
      ),
    }));
  }, []);

  const reopenTask = useCallback((taskId: ID) => {
    setDb((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, status: "Open" as const, completed_at: null } : t,
      ),
    }));
  }, []);

  const value = useMemo<CrmContextValue>(
    () => ({
      db,
      currentUser,
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
      db,
      currentUser,
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
    ],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm(): CrmContextValue {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used inside <CrmProvider>");
  return ctx;
}
