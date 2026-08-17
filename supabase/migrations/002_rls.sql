-- ============================================================
-- YKE Sales Compass — Row Level Security
-- Migration 002: RLS policies
-- ============================================================

-- Enable RLS on all tables
alter table organizations         enable row level security;
alter table profiles              enable row level security;
alter table campaigns             enable row level security;
alter table accounts              enable row level security;
alter table contacts              enable row level security;
alter table leads                 enable row level security;
alter table opportunities         enable row level security;
alter table interactions          enable row level security;
alter table tasks                 enable row level security;
alter table lead_stage_history    enable row level security;
alter table opportunity_stage_history enable row level security;
alter table audit_logs            enable row level security;

-- ============================================================
-- Helper: get current user's organization_id and role
-- ============================================================
create or replace function auth_org_id()
returns uuid language sql stable security definer as $$
  select organization_id from profiles where id = auth.uid()
$$;

create or replace function auth_role()
returns text language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- ============================================================
-- ORGANIZATIONS — read only for members
-- ============================================================
create policy "org_select" on organizations
  for select using (id = auth_org_id());

-- ============================================================
-- PROFILES
-- ============================================================
-- Anyone in the org can see profiles (needed to show owner names)
create policy "profiles_select" on profiles
  for select using (organization_id = auth_org_id());

-- Users can update their own profile
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- Admins can update any profile in their org
create policy "profiles_update_admin" on profiles
  for update using (
    organization_id = auth_org_id() and auth_role() = 'admin'
  );

-- Admins can insert profiles (onboarding)
create policy "profiles_insert_admin" on profiles
  for insert with check (
    organization_id = auth_org_id() and auth_role() = 'admin'
  );

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create policy "campaigns_select" on campaigns
  for select using (organization_id = auth_org_id());

create policy "campaigns_insert" on campaigns
  for insert with check (
    organization_id = auth_org_id() and
    auth_role() in ('marketing','manager','admin')
  );

create policy "campaigns_update" on campaigns
  for update using (
    organization_id = auth_org_id() and
    auth_role() in ('marketing','manager','admin')
  );

-- ============================================================
-- ACCOUNTS
-- ============================================================
create policy "accounts_select" on accounts
  for select using (organization_id = auth_org_id());

create policy "accounts_insert" on accounts
  for insert with check (organization_id = auth_org_id());

-- Sales reps can update their own accounts; managers/admin can update all
create policy "accounts_update" on accounts
  for update using (
    organization_id = auth_org_id() and (
      owner_id = auth.uid() or
      auth_role() in ('manager','admin')
    )
  );

-- Only managers/admins can delete
create policy "accounts_delete" on accounts
  for delete using (
    organization_id = auth_org_id() and
    auth_role() in ('manager','admin')
  );

-- ============================================================
-- CONTACTS
-- ============================================================
create policy "contacts_select" on contacts
  for select using (organization_id = auth_org_id());

create policy "contacts_insert" on contacts
  for insert with check (organization_id = auth_org_id());

create policy "contacts_update" on contacts
  for update using (
    organization_id = auth_org_id() and (
      owner_id = auth.uid() or
      auth_role() in ('manager','admin')
    )
  );

create policy "contacts_delete" on contacts
  for delete using (
    organization_id = auth_org_id() and
    auth_role() in ('manager','admin')
  );

-- ============================================================
-- LEADS
-- ============================================================
create policy "leads_select" on leads
  for select using (organization_id = auth_org_id());

create policy "leads_insert" on leads
  for insert with check (organization_id = auth_org_id());

create policy "leads_update" on leads
  for update using (
    organization_id = auth_org_id() and (
      owner_id = auth.uid() or
      auth_role() in ('manager','marketing','admin')
    )
  );

create policy "leads_delete" on leads
  for delete using (
    organization_id = auth_org_id() and
    auth_role() in ('manager','admin')
  );

-- ============================================================
-- OPPORTUNITIES
-- ============================================================
create policy "opportunities_select" on opportunities
  for select using (organization_id = auth_org_id());

create policy "opportunities_insert" on opportunities
  for insert with check (organization_id = auth_org_id());

create policy "opportunities_update" on opportunities
  for update using (
    organization_id = auth_org_id() and (
      owner_id = auth.uid() or
      auth_role() in ('manager','admin')
    )
  );

create policy "opportunities_delete" on opportunities
  for delete using (
    organization_id = auth_org_id() and
    auth_role() in ('manager','admin')
  );

-- ============================================================
-- INTERACTIONS
-- ============================================================
create policy "interactions_select" on interactions
  for select using (organization_id = auth_org_id());

create policy "interactions_insert" on interactions
  for insert with check (organization_id = auth_org_id());

create policy "interactions_update" on interactions
  for update using (
    organization_id = auth_org_id() and (
      owner_id = auth.uid() or
      auth_role() in ('manager','admin')
    )
  );

-- ============================================================
-- TASKS
-- ============================================================
create policy "tasks_select" on tasks
  for select using (organization_id = auth_org_id());

create policy "tasks_insert" on tasks
  for insert with check (organization_id = auth_org_id());

create policy "tasks_update" on tasks
  for update using (
    organization_id = auth_org_id() and (
      owner_id = auth.uid() or
      auth_role() in ('manager','admin')
    )
  );

-- ============================================================
-- HISTORY / AUDIT — read-only for all org members, insert by app
-- ============================================================
create policy "lead_stage_history_select" on lead_stage_history
  for select using (
    exists (
      select 1 from leads l
      where l.id = lead_stage_history.lead_id
        and l.organization_id = auth_org_id()
    )
  );

create policy "lead_stage_history_insert" on lead_stage_history
  for insert with check (
    exists (
      select 1 from leads l
      where l.id = lead_stage_history.lead_id
        and l.organization_id = auth_org_id()
    )
  );

create policy "opp_stage_history_select" on opportunity_stage_history
  for select using (
    exists (
      select 1 from opportunities o
      where o.id = opportunity_stage_history.opportunity_id
        and o.organization_id = auth_org_id()
    )
  );

create policy "opp_stage_history_insert" on opportunity_stage_history
  for insert with check (
    exists (
      select 1 from opportunities o
      where o.id = opportunity_stage_history.opportunity_id
        and o.organization_id = auth_org_id()
    )
  );

create policy "audit_logs_select" on audit_logs
  for select using (
    organization_id = auth_org_id() and
    auth_role() in ('manager','admin')
  );

create policy "audit_logs_insert" on audit_logs
  for insert with check (organization_id = auth_org_id());
