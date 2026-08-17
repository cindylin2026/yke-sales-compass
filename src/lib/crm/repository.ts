/**
 * Repository boundary.
 *
 * The UI only ever talks to a `CrmRepository`. Today it is implemented in
 * memory from ./seed. When Supabase is connected, add a
 * `SupabaseCrmRepository` that implements this same interface and swap it in
 * the provider — no page, component, or type has to change.
 */
import type {
  Account,
  Campaign,
  Contact,
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

export interface CrmRepository {
  snapshot(): CrmDatabase;

  updateLeadStage(leadId: ID, stage: LeadLifecycleStage, actorUserId: ID, note?: string): void;
  assignLead(leadId: ID, ownerUserId: ID | null): void;
  createLead(lead: Omit<Lead, "id" | "created_at" | "lifecycle_history">, actorUserId: ID): Lead;
  convertLead(input: ConvertLeadInput, actorUserId: ID): ConvertLeadResult;

  createAccount(account: Omit<Account, "id" | "created_at">): Account;
  createContact(contact: Omit<Contact, "id" | "created_at">): Contact;
  createOpportunity(opp: Omit<Opportunity, "id" | "created_at">): Opportunity;
  updateOpportunityStage(oppId: ID, stage: Opportunity["stage"]): void;

  createInteraction(interaction: Omit<Interaction, "id" | "created_at">): Interaction;
  requestAiSummary(interactionId: ID): void;

  createTask(task: Omit<Task, "id" | "created_at">): Task;
  completeTask(taskId: ID): void;
  reopenTask(taskId: ID): void;
}

export type { Campaign, User };

export function nowIso(): string {
  return new Date().toISOString();
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter}`;
}
