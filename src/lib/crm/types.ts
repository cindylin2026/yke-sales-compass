/**
 * YKE Sales OS — canonical data model.
 *
 * Every type here maps 1:1 to a planned PostgreSQL/Supabase table
 * (accounts, leads, contacts, opportunities, interactions, tasks, users,
 * campaigns). Relationships are expressed with explicit stable IDs only —
 * never nested objects — so the mock repository can be swapped for Supabase
 * queries without touching UI code.
 */

export type ID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;

export type Region = "US" | "Asia";

export type UserRole = "sales_rep" | "manager" | "marketing" | "admin";

export interface User {
  id: ID;
  full_name: string;
  email: string;
  role: UserRole;
  region: Region;
  title: string;
  avatar_initials: string;
}

export type LeadLifecycleStage = "New" | "MQL" | "SAL" | "SQL" | "Converted" | "Disqualified";

export const LEAD_STAGES: LeadLifecycleStage[] = ["New", "MQL", "SAL", "SQL", "Converted"];

export type LeadSource =
  | "Wix Website Inquiry"
  | "Event Registration"
  | "Trade Show"
  | "LinkedIn"
  | "Social Media"
  | "Referral"
  | "Partner"
  | "Outbound"
  | "Manual Entry"
  | "Other Campaign";

export const LEAD_SOURCES: LeadSource[] = [
  "Wix Website Inquiry",
  "Event Registration",
  "Trade Show",
  "LinkedIn",
  "Social Media",
  "Referral",
  "Partner",
  "Outbound",
  "Manual Entry",
  "Other Campaign",
];

export interface LifecycleEvent {
  stage: LeadLifecycleStage;
  changed_at: ISODateTime;
  changed_by_user_id: ID;
  note?: string | undefined;
}

export interface Lead {
  id: ID;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | undefined;
  title?: string | undefined;
  company_name: string;
  company_domain?: string | undefined;
  region: Region;
  source: LeadSource;
  source_detail?: string | undefined;
  campaign_id?: ID | null | undefined;
  lifecycle_stage: LeadLifecycleStage;
  lead_score: number; // 0-100 — how actionable is THIS prospect
  owner_user_id: ID | null;
  notes?: string | undefined;
  created_at: ISODateTime;
  last_contacted_at?: ISODateTime | null | undefined;
  lifecycle_history: LifecycleEvent[];
  // Conversion audit trail — the lead record is never deleted or copied.
  converted_at?: ISODateTime | null | undefined;
  converted_account_id?: ID | null | undefined;
  converted_contact_id?: ID | null | undefined;
  converted_opportunity_id?: ID | null | undefined;
}

export type AccountStatus =
  | "Target"
  | "Active Prospect"
  | "Customer"
  | "On Hold"
  | "Churned";

export type AccountSegment =
  | "Hotel"
  | "Airport"
  | "University"
  | "Hospital"
  | "Office / Corporate"
  | "Convenience Retail"
  | "Distributor"
  | "Entertainment";

export interface Account {
  id: ID;
  name: string;
  domain?: string | undefined;
  segment: AccountSegment;
  region: Region;
  country: string;
  city?: string | undefined;
  status: AccountStatus;
  account_fit_score: number; // 0-100 — ICP fit of the COMPANY
  employee_count?: number | undefined;
  locations_count?: number | undefined;
  owner_user_id: ID | null;
  created_at: ISODateTime;
  notes?: string | undefined;
}

export interface Contact {
  id: ID;
  account_id: ID;
  first_name: string;
  last_name: string;
  title?: string | undefined;
  email: string;
  phone?: string | undefined;
  is_primary: boolean;
  owner_user_id: ID | null;
  originating_lead_id?: ID | null | undefined;
  created_at: ISODateTime;
}

export type OpportunityStage = "Discovery" | "Proposal" | "Negotiation" | "Won" | "Lost";

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

export interface Opportunity {
  id: ID;
  name: string;
  account_id: ID;
  primary_contact_id: ID | null;
  owner_user_id: ID | null;
  stage: OpportunityStage;
  amount: number;
  probability: number; // 0-100
  expected_close_date: ISODate;
  next_action?: string | undefined;
  region: Region;
  originating_lead_id?: ID | null | undefined;
  created_at: ISODateTime;
  closed_at?: ISODateTime | null | undefined;
}

export type InteractionType =
  | "Email"
  | "Call"
  | "Meeting"
  | "Demo"
  | "LinkedIn"
  | "Event"
  | "Other";

export const INTERACTION_TYPES: InteractionType[] = [
  "Email",
  "Call",
  "Meeting",
  "Demo",
  "LinkedIn",
  "Event",
  "Other",
];

export interface Interaction {
  id: ID;
  type: InteractionType;
  occurred_at: ISODateTime;
  owner_user_id: ID | null;
  account_id?: ID | null | undefined;
  contact_id?: ID | null | undefined;
  lead_id?: ID | null | undefined;
  opportunity_id?: ID | null | undefined;
  subject: string;
  notes?: string | undefined;
  next_steps?: string | undefined;
  next_action?: string | undefined;
  next_action_due_date?: ISODate | null | undefined;
  /** Meeting notes doc — an AI summarizer will read this later. */
  source_doc_url?: string | null | undefined;
  ai_summary?: string | null | undefined;
  ai_summary_status?: "none" | "pending" | "ready" | undefined;
  created_at: ISODateTime;
}

export type TaskType =
  | "Call"
  | "Email"
  | "Meeting"
  | "Follow-up"
  | "Send Proposal"
  | "Demo"
  | "Other";

export const TASK_TYPES: TaskType[] = [
  "Call",
  "Email",
  "Meeting",
  "Follow-up",
  "Send Proposal",
  "Demo",
  "Other",
];

export type TaskStatus = "Open" | "Completed" | "Cancelled";

export interface Task {
  id: ID;
  title: string;
  type: TaskType;
  owner_user_id: ID | null;
  lead_id?: ID | null | undefined;
  account_id?: ID | null | undefined;
  contact_id?: ID | null | undefined;
  opportunity_id?: ID | null | undefined;
  due_date: ISODate;
  status: TaskStatus;
  next_action?: string | undefined;
  priority: "Low" | "Normal" | "High";
  created_at: ISODateTime;
  completed_at?: ISODateTime | null | undefined;
}

export type CampaignChannel =
  | "Website"
  | "Event"
  | "Trade Show"
  | "Paid Social"
  | "Email"
  | "Partner"
  | "Outbound";

export interface Campaign {
  id: ID;
  name: string;
  channel: CampaignChannel;
  region: Region | "Global";
  start_date: ISODate;
  end_date?: ISODate | null | undefined;
  budget?: number | undefined;
  is_active: boolean;
}

/** Full in-memory snapshot — mirrors the future SQL schema table-for-table. */
export interface CrmDatabase {
  users: User[];
  accounts: Account[];
  contacts: Contact[];
  leads: Lead[];
  opportunities: Opportunity[];
  interactions: Interaction[];
  tasks: Task[];
  campaigns: Campaign[];
}

export interface ConvertLeadInput {
  lead_id: ID;
  /** Existing account to link to, or null to create a new one. */
  account_id: ID | null;
  new_account?: {
    name: string;
    domain?: string;
    segment: AccountSegment;
    region: Region;
    country: string;
    status: AccountStatus;
    account_fit_score: number;
  };
  contact_id: ID | null;
  create_contact: boolean;
  create_opportunity: boolean;
  opportunity?: {
    name: string;
    stage: OpportunityStage;
    amount: number;
    probability: number;
    expected_close_date: ISODate;
    next_action?: string;
  };
  owner_user_id: ID | null;
}

export interface ConvertLeadResult {
  lead_id: ID;
  account_id: ID;
  contact_id: ID;
  opportunity_id: ID | null;
}
