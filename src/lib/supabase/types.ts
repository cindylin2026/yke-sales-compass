/**
 * Supabase database type definitions.
 * These mirror the PostgreSQL schema 1:1.
 * In a production project these would be auto-generated via:
 *   supabase gen types typescript --project-id nrzzzfiflsusetktkpsr
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type NullableKeys<T> = { [K in keyof T]: null extends T[K] ? K : never }[keyof T];
type MakeNullableOptional<T> = Omit<T, NullableKeys<T>> & Partial<Pick<T, NullableKeys<T>>>;

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<
            Database["public"]["Tables"]["organizations"]["Row"],
            "id" | "created_at" | "updated_at"
          >
        > &
          Partial<Pick<Database["public"]["Tables"]["organizations"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          email: string;
          role: "sales_rep" | "manager" | "marketing" | "admin";
          region:
            | "North America"
            | "Europe"
            | "UK"
            | "Australia"
            | "North Asia"
            | "Southeast Asia"
            | "Taiwan"
            | "Unknown";
          title: string | null;
          avatar_initials: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">
        >;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          channel:
            | "Website"
            | "Event"
            | "Trade Show"
            | "Paid Social"
            | "Email"
            | "Partner"
            | "Outbound"
            | "Other";
          region:
            | "North America"
            | "Europe"
            | "UK"
            | "Australia"
            | "North Asia"
            | "Southeast Asia"
            | "Taiwan"
            | "Unknown"
            | "Global";
          start_date: string | null;
          end_date: string | null;
          budget: number | null;
          is_active: boolean;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<Database["public"]["Tables"]["campaigns"]["Row"], "id" | "created_at" | "updated_at">
        > &
          Partial<Pick<Database["public"]["Tables"]["campaigns"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Row"]>;
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          domain: string | null;
          website: string | null;
          segment:
            | "Hotel"
            | "Airport"
            | "Transit Station"
            | "University"
            | "Healthcare"
            | "Office / Corporate"
            | "Convenience Retail"
            | "Manufacturing Facility"
            | "Laundromat"
            | "Distributor"
            | "Entertainment"
            | "Individual"
            | "Unknown"
            | null;
          region:
            | "North America"
            | "Europe"
            | "UK"
            | "Australia"
            | "North Asia"
            | "Southeast Asia"
            | "Taiwan"
            | "Unknown"
            | null;
          market: string | null;
          country: string | null;
          city: string | null;
          full_address: string | null;
          status: "Target" | "Active Prospect" | "Customer" | "On Hold" | "Churned";
          account_fit_score: number;
          employee_count: number | null;
          locations_count: number | null;
          owner_id: string | null;
          notes: string | null;
          foot_traffic_score: number | null;
          utility_readiness_score: number | null;
          brand_alignment_score: number | null;
          contract_complexity_score: number | null;
          decision_maker_accessibility_score: number | null;
          expansion_potential_score: number | null;
          operating_hours_per_day: number | null;
          operating_days_per_year: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<Database["public"]["Tables"]["accounts"]["Row"], "id" | "created_at" | "updated_at">
        > &
          Partial<Pick<Database["public"]["Tables"]["accounts"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["accounts"]["Row"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          organization_id: string;
          account_id: string | null;
          first_name: string;
          last_name: string;
          title: string | null;
          email: string | null;
          phone: string | null;
          linkedin_url: string | null;
          is_primary: boolean;
          owner_id: string | null;
          originating_lead_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<Database["public"]["Tables"]["contacts"]["Row"], "id" | "created_at" | "updated_at">
        > &
          Partial<Pick<Database["public"]["Tables"]["contacts"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          organization_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          title: string | null;
          company_name: string;
          company_domain: string | null;
          region:
            | "North America"
            | "Europe"
            | "UK"
            | "Australia"
            | "North Asia"
            | "Southeast Asia"
            | "Taiwan"
            | "Unknown";
          market: string | null;
          segment:
            | "Hotel"
            | "Airport"
            | "Transit Station"
            | "University"
            | "Healthcare"
            | "Office / Corporate"
            | "Convenience Retail"
            | "Manufacturing Facility"
            | "Laundromat"
            | "Distributor"
            | "Entertainment"
            | "Individual"
            | "Unknown"
            | null;
          source:
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
          source_detail: string | null;
          campaign_id: string | null;
          lifecycle_stage: "New" | "MQL" | "SAL" | "SQL" | "Converted" | "Disqualified";
          lead_score: number;
          owner_id: string | null;
          notes: string | null;
          last_contacted_at: string | null;
          next_action: string | null;
          next_action_due_date: string | null;
          converted_at: string | null;
          converted_account_id: string | null;
          converted_contact_id: string | null;
          converted_opportunity_id: string | null;
          disqualify_reason: string | null;
          foot_traffic_score: number | null;
          utility_readiness_score: number | null;
          brand_alignment_score: number | null;
          contract_complexity_score: number | null;
          decision_maker_accessibility_score: number | null;
          expansion_potential_score: number | null;
          site_fit_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<Database["public"]["Tables"]["leads"]["Row"], "id" | "created_at" | "updated_at">
        > &
          Partial<Pick<Database["public"]["Tables"]["leads"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>;
        Relationships: [];
      };
      opportunities: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          account_id: string;
          primary_contact_id: string | null;
          owner_id: string | null;
          stage: "Discovery" | "Demo" | "Proposal" | "Negotiation" | "Won" | "Lost";
          amount: number;
          boba_machine_qty: number;
          ramen_machine_qty: number;
          avg_daily_boba_units_low: number;
          avg_daily_boba_units_high: number;
          avg_daily_ramen_units_low: number;
          avg_daily_ramen_units_high: number;
          amount_low: number;
          amount_high: number;
          probability: number;
          expected_close_date: string | null;
          next_action: string | null;
          next_action_due_date: string | null;
          region:
            | "North America"
            | "Europe"
            | "UK"
            | "Australia"
            | "North Asia"
            | "Southeast Asia"
            | "Taiwan"
            | "Unknown"
            | null;
          originating_lead_id: string | null;
          closed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<
            Database["public"]["Tables"]["opportunities"]["Row"],
            "id" | "created_at" | "updated_at"
          >
        > &
          Partial<Pick<Database["public"]["Tables"]["opportunities"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["opportunities"]["Row"]>;
        Relationships: [];
      };
      interactions: {
        Row: {
          id: string;
          organization_id: string;
          type: "Email" | "Call" | "Meeting" | "Demo" | "LinkedIn" | "Event" | "Other";
          occurred_at: string;
          owner_id: string | null;
          account_id: string | null;
          contact_id: string | null;
          lead_id: string | null;
          opportunity_id: string | null;
          subject: string;
          notes: string | null;
          next_steps: string | null;
          next_action: string | null;
          next_action_due_date: string | null;
          google_doc_url: string | null;
          ai_summary: string | null;
          ai_summary_status: "none" | "pending" | "ready";
          created_at: string;
          updated_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<
            Database["public"]["Tables"]["interactions"]["Row"],
            "id" | "created_at" | "updated_at"
          >
        > &
          Partial<Pick<Database["public"]["Tables"]["interactions"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["interactions"]["Row"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          type: "Call" | "Email" | "Meeting" | "Follow-up" | "Send Proposal" | "Demo" | "Other";
          priority: "Low" | "Normal" | "High";
          status: "Open" | "Completed" | "Cancelled";
          due_date: string;
          owner_id: string | null;
          lead_id: string | null;
          account_id: string | null;
          contact_id: string | null;
          opportunity_id: string | null;
          next_action: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<Database["public"]["Tables"]["tasks"]["Row"], "id" | "created_at" | "updated_at">
        > &
          Partial<Pick<Database["public"]["Tables"]["tasks"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [];
      };
      lead_stage_history: {
        Row: {
          id: string;
          lead_id: string;
          old_stage: string | null;
          new_stage: string;
          changed_by: string | null;
          note: string | null;
          changed_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<Database["public"]["Tables"]["lead_stage_history"]["Row"], "id" | "changed_at">
        > &
          Partial<Pick<Database["public"]["Tables"]["lead_stage_history"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["lead_stage_history"]["Row"]>;
        Relationships: [];
      };
      opportunity_stage_history: {
        Row: {
          id: string;
          opportunity_id: string;
          old_stage: string | null;
          new_stage: string;
          changed_by: string | null;
          old_amount: number | null;
          new_amount: number | null;
          changed_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<
            Database["public"]["Tables"]["opportunity_stage_history"]["Row"],
            "id" | "changed_at"
          >
        > &
          Partial<Pick<Database["public"]["Tables"]["opportunity_stage_history"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["opportunity_stage_history"]["Row"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string | null;
          entity_type: string;
          entity_id: string | null;
          action: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: MakeNullableOptional<
          Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at">
        > &
          Partial<Pick<Database["public"]["Tables"]["audit_logs"]["Row"], "id">>;
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      convert_lead: {
        Args: {
          p_lead_id: string;
          p_account_id: string | null;
          p_new_account: Json | null;
          p_contact_id: string | null;
          p_create_contact: boolean;
          p_create_opportunity: boolean;
          p_opportunity: Json | null;
          p_owner_id: string | null;
        };
        Returns: Json;
      };
      auth_org_id: { Args: Record<never, never>; Returns: string };
      auth_role: { Args: Record<never, never>; Returns: string };
      update_lead_stage: {
        Args: {
          p_lead_id: string;
          p_new_stage: string;
          p_note: string | null;
          p_disqualify_reason: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
  };
}
