-- ============================================================
-- YKE Sales Compass — Core Schema
-- Migration 001: Tables, indexes, constraints
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  full_name       text not null,
  email           text not null,
  role            text not null check (role in ('sales_rep','manager','marketing','admin')),
  region          text not null check (region in ('US','Asia')) default 'US',
  title           text,
  avatar_initials text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists profiles_org_idx on profiles(organization_id);
create index if not exists profiles_email_idx on profiles(email);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create table if not exists campaigns (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name            text not null,
  channel         text not null check (channel in ('Website','Event','Trade Show','Paid Social','Email','Partner','Outbound','Other')),
  region          text not null check (region in ('US','Asia','Global')) default 'Global',
  start_date      date,
  end_date        date,
  budget          numeric(12,2),
  is_active       boolean not null default true,
  owner_id        uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists campaigns_org_idx on campaigns(organization_id);

-- ============================================================
-- ACCOUNTS
-- ============================================================
create table if not exists accounts (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id),
  name                text not null,
  domain              text,
  website             text,
  segment             text check (segment in ('Hotel','Airport','University','Hospital','Office / Corporate','Convenience Retail','Distributor','Entertainment')),
  region              text check (region in ('US','Asia')),
  country             text,
  city                text,
  full_address        text,
  status              text not null check (status in ('Target','Active Prospect','Customer','On Hold','Churned')) default 'Target',
  account_fit_score   integer check (account_fit_score between 0 and 100) default 50,
  employee_count      integer,
  locations_count     integer,
  owner_id            uuid references profiles(id),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists accounts_org_idx on accounts(organization_id);
create index if not exists accounts_owner_idx on accounts(owner_id);
create index if not exists accounts_status_idx on accounts(status);
create index if not exists accounts_domain_idx on accounts(domain);
-- Normalized domain for duplicate detection
create index if not exists accounts_domain_lower_idx on accounts(lower(domain));

-- ============================================================
-- CONTACTS
-- ============================================================
create table if not exists contacts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  account_id      uuid references accounts(id) on delete set null,
  first_name      text not null,
  last_name       text not null,
  title           text,
  email           text,
  phone           text,
  linkedin_url    text,
  is_primary      boolean not null default false,
  owner_id        uuid references profiles(id),
  originating_lead_id uuid, -- FK added after leads table
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists contacts_org_idx on contacts(organization_id);
create index if not exists contacts_account_idx on contacts(account_id);
create index if not exists contacts_owner_idx on contacts(owner_id);
create index if not exists contacts_email_lower_idx on contacts(lower(email));

-- ============================================================
-- LEADS
-- ============================================================
create table if not exists leads (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references organizations(id),
  first_name              text not null,
  last_name               text not null,
  email                   text,
  phone                   text,
  title                   text,
  company_name            text not null,
  company_domain          text,
  region                  text check (region in ('US','Asia')) default 'US',
  source                  text not null check (source in (
    'Wix Website Inquiry','Event Registration','Trade Show','LinkedIn',
    'Social Media','Referral','Partner','Outbound','Manual Entry','Other Campaign'
  )),
  source_detail           text,
  campaign_id             uuid references campaigns(id) on delete set null,
  lifecycle_stage         text not null check (lifecycle_stage in (
    'New','MQL','SAL','SQL','Converted','Disqualified'
  )) default 'New',
  lead_score              integer not null check (lead_score between 0 and 100) default 50,
  owner_id                uuid references profiles(id),
  notes                   text,
  last_contacted_at       timestamptz,
  next_action             text,
  next_action_due_date    date,
  -- Conversion audit trail
  converted_at            timestamptz,
  converted_account_id    uuid references accounts(id) on delete set null,
  converted_contact_id    uuid references contacts(id) on delete set null,
  converted_opportunity_id uuid, -- FK added after opportunities table
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists leads_org_idx on leads(organization_id);
create index if not exists leads_owner_idx on leads(owner_id);
create index if not exists leads_stage_idx on leads(lifecycle_stage);
create index if not exists leads_campaign_idx on leads(campaign_id);
create index if not exists leads_email_lower_idx on leads(lower(email));
create index if not exists leads_company_lower_idx on leads(lower(company_name));

-- Now add the FK from contacts back to leads
alter table contacts
  add constraint contacts_originating_lead_fk
  foreign key (originating_lead_id) references leads(id) on delete set null;

-- ============================================================
-- OPPORTUNITIES
-- ============================================================
create table if not exists opportunities (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id),
  name                  text not null,
  account_id            uuid not null references accounts(id),
  primary_contact_id    uuid references contacts(id) on delete set null,
  owner_id              uuid references profiles(id),
  stage                 text not null check (stage in (
    'Discovery','Proposal','Negotiation','Won','Lost'
  )) default 'Discovery',
  amount                numeric(14,2) not null default 0,
  probability           integer check (probability between 0 and 100) default 20,
  expected_close_date   date,
  next_action           text,
  next_action_due_date  date,
  region                text check (region in ('US','Asia')),
  originating_lead_id   uuid references leads(id) on delete set null,
  closed_at             timestamptz,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists opportunities_org_idx on opportunities(organization_id);
create index if not exists opportunities_account_idx on opportunities(account_id);
create index if not exists opportunities_owner_idx on opportunities(owner_id);
create index if not exists opportunities_stage_idx on opportunities(stage);

-- Close the circular FK: leads.converted_opportunity_id → opportunities
alter table leads
  add constraint leads_converted_opportunity_fk
  foreign key (converted_opportunity_id) references opportunities(id) on delete set null;

-- ============================================================
-- LEAD STAGE HISTORY
-- ============================================================
create table if not exists lead_stage_history (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  old_stage   text,
  new_stage   text not null,
  changed_by  uuid references profiles(id),
  note        text,
  changed_at  timestamptz not null default now()
);

create index if not exists lead_stage_history_lead_idx on lead_stage_history(lead_id);

-- ============================================================
-- OPPORTUNITY STAGE HISTORY
-- ============================================================
create table if not exists opportunity_stage_history (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references opportunities(id) on delete cascade,
  old_stage       text,
  new_stage       text not null,
  changed_by      uuid references profiles(id),
  old_amount      numeric(14,2),
  new_amount      numeric(14,2),
  changed_at      timestamptz not null default now()
);

create index if not exists opp_stage_history_opp_idx on opportunity_stage_history(opportunity_id);

-- ============================================================
-- INTERACTIONS
-- ============================================================
create table if not exists interactions (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id),
  type                text not null check (type in (
    'Email','Call','Meeting','Demo','LinkedIn','Event','Other'
  )),
  occurred_at         timestamptz not null,
  owner_id            uuid references profiles(id),
  account_id          uuid references accounts(id) on delete set null,
  contact_id          uuid references contacts(id) on delete set null,
  lead_id             uuid references leads(id) on delete set null,
  opportunity_id      uuid references opportunities(id) on delete set null,
  subject             text not null,
  notes               text,
  next_steps          text,
  next_action         text,
  next_action_due_date date,
  google_doc_url      text,
  ai_summary          text,
  ai_summary_status   text check (ai_summary_status in ('none','pending','ready')) default 'none',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists interactions_org_idx on interactions(organization_id);
create index if not exists interactions_owner_idx on interactions(owner_id);
create index if not exists interactions_account_idx on interactions(account_id);
create index if not exists interactions_lead_idx on interactions(lead_id);
create index if not exists interactions_opportunity_idx on interactions(opportunity_id);
create index if not exists interactions_occurred_idx on interactions(occurred_at desc);

-- ============================================================
-- TASKS
-- ============================================================
create table if not exists tasks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  title           text not null,
  type            text not null check (type in (
    'Call','Email','Meeting','Follow-up','Send Proposal','Demo','Other'
  )),
  priority        text not null check (priority in ('Low','Normal','High')) default 'Normal',
  status          text not null check (status in ('Open','Completed','Cancelled')) default 'Open',
  due_date        date not null,
  owner_id        uuid references profiles(id),
  lead_id         uuid references leads(id) on delete set null,
  account_id      uuid references accounts(id) on delete set null,
  contact_id      uuid references contacts(id) on delete set null,
  opportunity_id  uuid references opportunities(id) on delete set null,
  next_action     text,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists tasks_org_idx on tasks(organization_id);
create index if not exists tasks_owner_idx on tasks(owner_id);
create index if not exists tasks_status_idx on tasks(status);
create index if not exists tasks_due_date_idx on tasks(due_date);
create index if not exists tasks_lead_idx on tasks(lead_id);
create index if not exists tasks_account_idx on tasks(account_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table if not exists audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  user_id         uuid references profiles(id),
  entity_type     text not null,
  entity_id       uuid,
  action          text not null,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists audit_logs_org_idx on audit_logs(organization_id);
create index if not exists audit_logs_entity_idx on audit_logs(entity_type, entity_id);
create index if not exists audit_logs_user_idx on audit_logs(user_id);
create index if not exists audit_logs_created_idx on audit_logs(created_at desc);

-- ============================================================
-- updated_at triggers (auto-update on every row change)
-- ============================================================
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_updated_at    before update on accounts    for each row execute function touch_updated_at();
create trigger contacts_updated_at    before update on contacts    for each row execute function touch_updated_at();
create trigger leads_updated_at       before update on leads       for each row execute function touch_updated_at();
create trigger opportunities_updated_at before update on opportunities for each row execute function touch_updated_at();
create trigger interactions_updated_at before update on interactions for each row execute function touch_updated_at();
create trigger tasks_updated_at       before update on tasks       for each row execute function touch_updated_at();
create trigger campaigns_updated_at   before update on campaigns   for each row execute function touch_updated_at();
create trigger profiles_updated_at    before update on profiles    for each row execute function touch_updated_at();
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
-- ============================================================
-- YKE Sales Compass — Business Logic Functions
-- Migration 003: convert_lead(), stage-change triggers, audit
-- ============================================================

-- ============================================================
-- LEAD STAGE HISTORY: auto-record on leads.lifecycle_stage change
-- ============================================================
create or replace function record_lead_stage_change()
returns trigger language plpgsql security definer as $$
begin
  if old.lifecycle_stage is distinct from new.lifecycle_stage then
    insert into lead_stage_history (lead_id, old_stage, new_stage, changed_by)
    values (new.id, old.lifecycle_stage, new.lifecycle_stage, auth.uid());
  end if;
  return new;
end;
$$;

create trigger leads_stage_history_trigger
  after update on leads
  for each row execute function record_lead_stage_change();

-- ============================================================
-- OPPORTUNITY STAGE HISTORY: auto-record on stage/amount change
-- ============================================================
create or replace function record_opportunity_stage_change()
returns trigger language plpgsql security definer as $$
begin
  if old.stage is distinct from new.stage or old.amount is distinct from new.amount then
    insert into opportunity_stage_history (
      opportunity_id, old_stage, new_stage, changed_by, old_amount, new_amount
    )
    values (
      new.id, old.stage, new.stage, auth.uid(), old.amount, new.amount
    );
  end if;
  return new;
end;
$$;

create trigger opportunities_stage_history_trigger
  after update on opportunities
  for each row execute function record_opportunity_stage_change();

-- ============================================================
-- CONVERT LEAD — atomic, transactional
-- Params:
--   p_lead_id            uuid
--   p_account_id         uuid | null  (null = create new)
--   p_new_account        jsonb | null
--   p_contact_id         uuid | null  (null = create new)
--   p_create_contact     boolean
--   p_create_opportunity boolean
--   p_opportunity        jsonb | null
--   p_owner_id           uuid | null
-- Returns: jsonb { lead_id, account_id, contact_id, opportunity_id }
-- ============================================================
create or replace function convert_lead(
  p_lead_id             uuid,
  p_account_id          uuid,
  p_new_account         jsonb,
  p_contact_id          uuid,
  p_create_contact      boolean,
  p_create_opportunity  boolean,
  p_opportunity         jsonb,
  p_owner_id            uuid
)
returns jsonb language plpgsql security definer as $$
declare
  v_lead              leads%rowtype;
  v_account_id        uuid := p_account_id;
  v_contact_id        uuid := p_contact_id;
  v_opportunity_id    uuid := null;
  v_org_id            uuid;
  v_owner_id          uuid;
  v_stamp             timestamptz := now();
begin
  -- Load lead and verify it belongs to the caller's org
  select * into v_lead from leads where id = p_lead_id;
  if not found then
    raise exception 'Lead not found: %', p_lead_id;
  end if;

  v_org_id  := v_lead.organization_id;
  v_owner_id := coalesce(p_owner_id, v_lead.owner_id);

  -- Verify caller is in the same org
  if v_org_id != auth_org_id() then
    raise exception 'Unauthorized';
  end if;

  -- Already converted?
  if v_lead.lifecycle_stage = 'Converted' then
    raise exception 'Lead is already converted';
  end if;

  -- ── Step 1: Account ─────────────────────────────────────────
  if v_account_id is null then
    insert into accounts (
      organization_id, name, domain, segment,
      region, country, status, account_fit_score, owner_id
    )
    values (
      v_org_id,
      coalesce(p_new_account->>'name', v_lead.company_name),
      coalesce(p_new_account->>'domain', v_lead.company_domain),
      coalesce(p_new_account->>'segment', 'Office / Corporate'),
      coalesce(p_new_account->>'region', v_lead.region),
      coalesce(p_new_account->>'country', case when v_lead.region = 'Asia' then 'Singapore' else 'United States' end),
      coalesce(p_new_account->>'status', 'Active Prospect'),
      coalesce((p_new_account->>'account_fit_score')::integer, 60),
      v_owner_id
    )
    returning id into v_account_id;
  end if;

  -- ── Step 2: Contact ──────────────────────────────────────────
  if v_contact_id is null and p_create_contact then
    insert into contacts (
      organization_id, account_id,
      first_name, last_name, title, email, phone,
      is_primary, owner_id, originating_lead_id
    )
    values (
      v_org_id, v_account_id,
      v_lead.first_name, v_lead.last_name, v_lead.title,
      v_lead.email, v_lead.phone,
      not exists (select 1 from contacts where account_id = v_account_id),
      v_owner_id,
      v_lead.id
    )
    returning id into v_contact_id;
  end if;

  -- ── Step 3: Opportunity (optional) ──────────────────────────
  if p_create_opportunity and p_opportunity is not null then
    insert into opportunities (
      organization_id, name, account_id, primary_contact_id,
      owner_id, stage, amount, probability,
      expected_close_date, next_action,
      region, originating_lead_id
    )
    values (
      v_org_id,
      p_opportunity->>'name',
      v_account_id,
      v_contact_id,
      v_owner_id,
      coalesce(p_opportunity->>'stage', 'Discovery'),
      coalesce((p_opportunity->>'amount')::numeric, 0),
      coalesce((p_opportunity->>'probability')::integer, 20),
      (p_opportunity->>'expected_close_date')::date,
      p_opportunity->>'next_action',
      v_lead.region,
      v_lead.id
    )
    returning id into v_opportunity_id;
  end if;

  -- ── Step 4: Stamp the lead ───────────────────────────────────
  update leads set
    lifecycle_stage           = 'Converted',
    converted_at              = v_stamp,
    converted_account_id      = v_account_id,
    converted_contact_id      = v_contact_id,
    converted_opportunity_id  = v_opportunity_id,
    updated_at                = v_stamp
  where id = p_lead_id;

  -- Reassign orphaned interactions/tasks from lead to new account+contact
  update interactions set
    account_id = v_account_id,
    contact_id = coalesce(v_contact_id, contact_id)
  where lead_id = p_lead_id and account_id is null;

  update tasks set
    account_id = v_account_id,
    contact_id = coalesce(v_contact_id, contact_id)
  where lead_id = p_lead_id and account_id is null;

  -- ── Step 5: Audit log ────────────────────────────────────────
  insert into audit_logs (organization_id, user_id, entity_type, entity_id, action, metadata)
  values (
    v_org_id,
    auth.uid(),
    'lead',
    p_lead_id,
    'converted',
    jsonb_build_object(
      'account_id', v_account_id,
      'contact_id', v_contact_id,
      'opportunity_id', v_opportunity_id
    )
  );

  return jsonb_build_object(
    'lead_id',          p_lead_id,
    'account_id',       v_account_id,
    'contact_id',       v_contact_id,
    'opportunity_id',   v_opportunity_id
  );
end;
$$;

-- ============================================================
-- AUDIT TRIGGER: generic action logging for key entities
-- ============================================================
create or replace function audit_entity_change()
returns trigger language plpgsql security definer as $$
declare
  v_action text;
  v_org_id uuid;
  v_meta jsonb;
begin
  if TG_OP = 'INSERT' then
    v_action := 'created';
    v_org_id := new.organization_id;
    v_meta := jsonb_build_object('new', row_to_json(new));
  elsif TG_OP = 'UPDATE' then
    v_action := 'updated';
    v_org_id := new.organization_id;
    v_meta := jsonb_build_object(
      'old', row_to_json(old),
      'new', row_to_json(new)
    );
  elsif TG_OP = 'DELETE' then
    v_action := 'deleted';
    v_org_id := old.organization_id;
    v_meta := jsonb_build_object('old', row_to_json(old));
    new := old;
  end if;

  insert into audit_logs (organization_id, user_id, entity_type, entity_id, action, metadata)
  values (v_org_id, auth.uid(), TG_TABLE_NAME, new.id, v_action, v_meta);

  return new;
end;
$$;

-- Apply audit triggers to key tables
create trigger accounts_audit
  after insert or update or delete on accounts
  for each row execute function audit_entity_change();

create trigger opportunities_audit
  after insert or update or delete on opportunities
  for each row execute function audit_entity_change();

-- ============================================================
-- AUTO-CREATE PROFILE on new auth.users signup
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
begin
  -- Use the org_id passed in metadata, or the first org as fallback
  v_org_id := coalesce(
    (new.raw_user_meta_data->>'organization_id')::uuid,
    (select id from organizations limit 1)
  );

  insert into profiles (id, organization_id, full_name, email, role, region, title, avatar_initials)
  values (
    new.id,
    v_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'sales_rep'),
    coalesce(new.raw_user_meta_data->>'region', 'US'),
    new.raw_user_meta_data->>'title',
    upper(left(coalesce(new.raw_user_meta_data->>'full_name', new.email), 1)) ||
    upper(left(split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 2), 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
-- ============================================================
-- YKE Sales Compass — Seed Data
-- Migration 004: Realistic demo data for YKE
-- ============================================================
-- NOTE: Run AFTER creating the first admin user via Supabase Auth.
-- The seed script references a fixed org_id and user IDs.
-- For initial setup, org + profiles are seeded here with
-- a placeholder auth_id that must be replaced after real signup.
-- ============================================================

-- ── Organization ─────────────────────────────────────────────
insert into organizations (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Yo-Kai Express');

-- ── Campaigns ────────────────────────────────────────────────
insert into campaigns (id, organization_id, name, channel, region, start_date, end_date, budget, is_active) values
  ('ca000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','HITEC 2026 Chicago',     'Event',      'US',     '2026-06-16','2026-06-19', 28000,  true),
  ('ca000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','LinkedIn Q3 US',         'Paid Social', 'US',    '2026-07-01', null,         15000,  true),
  ('ca000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Wix Website Inbound',    'Website',    'Global', '2026-01-01', null,         0,      true),
  ('ca000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Asia F&B Summit 2026',   'Event',      'Asia',   '2026-09-10','2026-09-12', 22000,  true),
  ('ca000001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Partner Referral US Q3', 'Partner',    'US',     '2026-07-01', null,         5000,   true),
  ('ca000001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','NRA Show 2026',          'Trade Show', 'US',     '2026-05-17','2026-05-20', 35000,  false),
  ('ca000001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','Singapore HX Expo',      'Event',      'Asia',   '2026-04-08','2026-04-10', 18000,  false),
  ('ca000001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Email Nurture US',       'Email',      'US',     '2026-06-01', null,         3000,   true);

-- ── Accounts ─────────────────────────────────────────────────
insert into accounts (id, organization_id, name, domain, segment, region, country, city, status, account_fit_score, employee_count, locations_count) values
  ('ac000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Hilton Hotels & Resorts',       'hilton.com',           'Hotel',              'US',   'United States','McLean',      'Customer',        95, 150000, 600),
  ('ac000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Marriott International',        'marriott.com',         'Hotel',              'US',   'United States','Bethesda',    'Active Prospect', 92, 180000, 500),
  ('ac000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','San Francisco International Airport','flysfo.com',      'Airport',            'US',   'United States','San Francisco','Active Prospect',88, 2000,  1),
  ('ac000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','University of Michigan',        'umich.edu',            'University',         'US',   'United States','Ann Arbor',   'Active Prospect', 85, 48000, 40),
  ('ac000001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Cedars-Sinai Medical Center',   'cedars-sinai.org',     'Hospital',           'US',   'United States','Los Angeles', 'Target',          80, 14000, 3),
  ('ac000001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','Google LLC',                    'google.com',           'Office / Corporate', 'US',   'United States','Mountain View','Customer',       90, 180000, 50),
  ('ac000001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','7-Eleven Inc.',                 '7-eleven.com',         'Convenience Retail', 'US',   'United States','Irving',      'Active Prospect', 75, 8000,  13000),
  ('ac000001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Aramark Corporation',           'aramark.com',          'Distributor',        'US',   'United States','Philadelphia','Target',          70, 280000, 500),
  ('ac000001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','Marina Bay Sands',              'marinabaysands.com',   'Hotel',              'Asia', 'Singapore',   'Singapore',   'Customer',        94, 10000, 1),
  ('ac000001-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','Changi Airport Group',          'changiairport.com',    'Airport',            'Asia', 'Singapore',   'Singapore',   'Active Prospect', 91, 5000,  1),
  ('ac000001-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','National University of Singapore','nus.edu.sg',         'University',         'Asia', 'Singapore',   'Singapore',   'Active Prospect', 83, 14000, 4),
  ('ac000001-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Sands Expo & Convention Centre','sandscasino.com',     'Entertainment',      'Asia', 'Singapore',   'Singapore',   'Target',          78, 6000,  1),
  ('ac000001-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','Hyatt Corporation',             'hyatt.com',            'Hotel',              'US',   'United States','Chicago',     'Target',          87, 100000, 300),
  ('ac000001-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000001','Compass Group',                 'compass-group.com',    'Distributor',        'US',   'United States','Charlotte',   'Target',          72, 600000, 2000),
  ('ac000001-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000001','Singapore Airlines',            'singaporeair.com',     'Airport',            'Asia', 'Singapore',   'Singapore',   'Target',          82, 27000, 5);

-- ── Contacts ─────────────────────────────────────────────────
insert into contacts (id, organization_id, account_id, first_name, last_name, title, email, phone, is_primary) values
  ('co000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000001','James','Whitfield','VP F&B Operations','james.whitfield@hilton.com','+1-703-555-0101',true),
  ('co000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000001','Rachel','Torres','Director of Procurement','r.torres@hilton.com','+1-703-555-0102',false),
  ('co000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000002','Michael','Chen','Head of Restaurant Operations','m.chen@marriott.com','+1-301-555-0201',true),
  ('co000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000002','Angela','Park','F&B Innovation Manager','a.park@marriott.com','+1-301-555-0202',false),
  ('co000001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000003','David','Kim','Director of Concessions','d.kim@flysfo.com','+1-650-555-0301',true),
  ('co000001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000004','Jennifer','Liu','Director of Dining Services','j.liu@umich.edu','+1-734-555-0401',true),
  ('co000001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000006','Kevin','Zhang','Workplace Services Lead','k.zhang@google.com','+1-650-555-0601',true),
  ('co000001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000007','Sandra','Lee','VP Foodservice Innovation','s.lee@7-eleven.com','+1-972-555-0701',true),
  ('co000001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000009','William','Tan','F&B Operations Director','w.tan@marinabaysands.com','+65-6555-0901',true),
  ('co000001-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000009','Priya','Nair','Head of Concierge Services','p.nair@marinabaysands.com','+65-6555-0902',false),
  ('co000001-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000010','Benjamin','Lim','VP Commercial','b.lim@changiairport.com','+65-6555-1001',true),
  ('co000001-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000011','Amanda','Yeo','Campus Dining Director','a.yeo@nus.edu.sg','+65-6555-1101',true),
  ('co000001-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000013','Robert','Hayes','VP Food & Beverage','r.hayes@hyatt.com','+1-312-555-1301',true),
  ('co000001-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000014','Christine','Wong','SVP Strategy','c.wong@compass-group.com','+1-704-555-1401',true),
  ('co000001-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000015','Aaron','Ng','Lounge Operations Manager','a.ng@singaporeair.com','+65-6555-1501',true);

-- ── Leads ────────────────────────────────────────────────────
insert into leads (id, organization_id, first_name, last_name, email, phone, title, company_name, company_domain, region, source, source_detail, campaign_id, lifecycle_stage, lead_score, notes) values
  ('le000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Thomas','Nguyen','t.nguyen@radissonblu.com','+1-312-555-2001','Director of Operations','Radisson Blu Chicago','radissonblu.com','US','Event Registration','HITEC 2026','ca000001-0000-0000-0000-000000000001','SQL',88,'Met at HITEC — running 3 hotels, keen on automation. Demo scheduled.'),
  ('le000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Mei','Sasaki','mei.sasaki@narita-airport.jp','+81-476-555-2002','F&B Concessions Manager','Narita International Airport','narita-airport.jp','Asia','Event Registration','Asia F&B Summit','ca000001-0000-0000-0000-000000000004','MQL',75,'Interested in kiosk deployment across 4 terminals.'),
  ('le000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Carlos','Rivera','c.rivera@usc.edu','+1-213-555-2003','VP Student Services','University of Southern California','usc.edu','US','Wix Website Inquiry','Homepage contact form','ca000001-0000-0000-0000-000000000003','New',62,'Looking for automated dining solutions for 3 campus locations.'),
  ('le000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Sophie','Martin','s.martin@ihg.com','+44-20-555-2004','Group F&B Director','IHG Hotels & Resorts','ihg.com','US','LinkedIn','LinkedIn InMail outreach','ca000001-0000-0000-0000-000000000002','SAL',81,'Responded to LinkedIn. Has budget for pilot in Q4. Needs ROI data.'),
  ('le000001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Raj','Patel','r.patel@mountelizabeth.com.sg','+65-6555-2005','Head of Patient Services','Mount Elizabeth Hospital','mountelizabeth.com.sg','Asia','Referral','Referred by MBS team','ca000001-0000-0000-0000-000000000005','New',70,'Warm referral from Marina Bay Sands. Initial interest in pilot.'),
  ('le000001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','Lisa','Huang','l.huang@ntu.edu.sg','+65-6555-2006','Facilities Director','Nanyang Technological University','ntu.edu.sg','Asia','Event Registration','Asia F&B Summit','ca000001-0000-0000-0000-000000000004','MQL',73,'NTU has 30K students. Very interested in high-volume automation.'),
  ('le000001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','Brian','Foster','b.foster@omnihotels.com','+1-214-555-2007','Regional VP Operations','Omni Hotels & Resorts','omnihotels.com','US','Trade Show','NRA Show 2026','ca000001-0000-0000-0000-000000000006','SQL',85,'Strong fit. Visited booth twice at NRA. Wants proposal by Aug 30.'),
  ('le000001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Yuna','Kim','yuna.kim@lottehotel.com','+82-2-555-2008','F&B Innovation Lead','Lotte Hotel Seoul','lottehotel.com','Asia','LinkedIn','LinkedIn connection','ca000001-0000-0000-0000-000000000002','New',65,'Korean market opportunity. Initial outreach.'),
  ('le000001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','Derek','Walsh','d.walsh@unlv.edu','+1-702-555-2009','Campus Dining Director','UNLV','unlv.edu','US','Outbound','Cold outreach sequence','','New',55,'Potential for campus kiosk program. No response yet.'),
  ('le000001-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','Priya','Singh','p.singh@tataconsultancy.in','+91-22-555-2010','Head of Workplace Experience','Tata Consultancy Services','tcs.com','Asia','Partner','Sodexo partner referral','ca000001-0000-0000-0000-000000000005','SAL',79,'Partner intro via Sodexo. 50+ office locations in Asia.'),
  ('le000001-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Marcus','Johnson','m.johnson@amfoodco.com','+1-404-555-2011','Director of Vending','American Food Co','amfoodco.com','US','Wix Website Inquiry','Website inquiry form','ca000001-0000-0000-0000-000000000003','MQL',68,'Vending operator interested in smart kiosk expansion.'),
  ('le000001-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Aiyana','Holt','a.holt@stanfordhealth.org','+1-650-555-2012','Patient Experience Manager','Stanford Health Care','stanfordhealth.org','US','Referral','Cedars-Sinai intro','ca000001-0000-0000-0000-000000000005','New',72,'Hospital segment — warm referral. High-traffic cafeteria.'),
  ('le000001-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','Hiroshi','Tanaka','h.tanaka@tokyu-hotels.co.jp','+81-3-555-2013','VP F&B','Tokyu Hotels','tokyu-hotels.co.jp','Asia','Event Registration','Asia F&B Summit','ca000001-0000-0000-0000-000000000004','MQL',76,'Japan market. Multiple urban hotel properties.'),
  ('le000001-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000001','Fatima','Al-Hassan','f.alhassan@qatarairways.com','+974-555-2014','Lounge Operations Director','Qatar Airways','qatarairways.com','Asia','Outbound','Senior AE outreach','','New',60,'Premium lounge automation opportunity. Long sales cycle expected.'),
  ('le000001-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000001','James','O''Brien','j.obrien@sodexo.com','+1-301-555-2015','SVP Growth','Sodexo North America','sodexo.com','US','Event Registration','HITEC 2026','ca000001-0000-0000-0000-000000000001','SAL',84,'Sodexo is a major potential distributor partner. Escalate to manager.'),
  ('le000001-0000-0000-0000-000000000016','00000000-0000-0000-0000-000000000001','Wei','Chen','w.chen@pekingairport.com','+86-10-555-2016','Concessions Director','Beijing Capital Airport','pekingairport.com','Asia','Social Media','WeChat outreach','','New',58,'Interested via WeChat. Early stage. China market exploration.'),
  ('le000001-0000-0000-0000-000000000017','00000000-0000-0000-0000-000000000001','Patricia','Moore','p.moore@caesars.com','+1-702-555-2017','VP Entertainment Dining','Caesars Entertainment','caesars.com','US','Outbound','Outbound sequence','','New',63,'High-volume entertainment venue. Strong fit if they bite.'),
  ('le000001-0000-0000-0000-000000000018','00000000-0000-0000-0000-000000000001','Siddharth','Kapoor','s.kapoor@oberoihotels.com','+91-11-555-2018','Group Operations Director','The Oberoi Group','oberoihotels.com','Asia','LinkedIn','LinkedIn InMail','ca000001-0000-0000-0000-000000000002','MQL',77,'Luxury hotel group in India. 30+ properties. Strong interest.'),
  ('le000001-0000-0000-0000-000000000019','00000000-0000-0000-0000-000000000001','Ashley','Turner','a.turner@hyve.com','+1-617-555-2019','Operations Analyst','Hyve Group','hyve.com','US','Wix Website Inquiry','Website inquiry','ca000001-0000-0000-0000-000000000003','New',51,'Low score, just exploring. Follow up in 2 weeks.'),
  ('le000001-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001','Daniel','Fox','d.fox@mgmresorts.com','+1-702-555-2020','SVP Food & Beverage','MGM Resorts International','mgmresorts.com','US','Event Registration','HITEC 2026','ca000001-0000-0000-0000-000000000001','SQL',91,'Top lead from HITEC. MGM has 30+ properties. Demo next Tuesday.');

-- ── Lead stage history (manual seed for demo leads) ──────────
insert into lead_stage_history (lead_id, old_stage, new_stage, changed_at) values
  ('le000001-0000-0000-0000-000000000001', null,   'New', now() - interval '45 days'),
  ('le000001-0000-0000-0000-000000000001', 'New',  'MQL', now() - interval '30 days'),
  ('le000001-0000-0000-0000-000000000001', 'MQL',  'SAL', now() - interval '20 days'),
  ('le000001-0000-0000-0000-000000000001', 'SAL',  'SQL', now() - interval '10 days'),
  ('le000001-0000-0000-0000-000000000004', null,   'New', now() - interval '35 days'),
  ('le000001-0000-0000-0000-000000000004', 'New',  'MQL', now() - interval '25 days'),
  ('le000001-0000-0000-0000-000000000004', 'MQL',  'SAL', now() - interval '12 days'),
  ('le000001-0000-0000-0000-000000000007', null,   'New', now() - interval '40 days'),
  ('le000001-0000-0000-0000-000000000007', 'New',  'MQL', now() - interval '28 days'),
  ('le000001-0000-0000-0000-000000000007', 'MQL',  'SAL', now() - interval '18 days'),
  ('le000001-0000-0000-0000-000000000007', 'SAL',  'SQL', now() - interval '8 days'),
  ('le000001-0000-0000-0000-000000000020', null,   'New', now() - interval '20 days'),
  ('le000001-0000-0000-0000-000000000020', 'New',  'MQL', now() - interval '14 days'),
  ('le000001-0000-0000-0000-000000000020', 'MQL',  'SAL', now() - interval '9 days'),
  ('le000001-0000-0000-0000-000000000020', 'SAL',  'SQL', now() - interval '4 days');

-- ── Opportunities ─────────────────────────────────────────────
insert into opportunities (id, organization_id, name, account_id, primary_contact_id, stage, amount, probability, expected_close_date, next_action, region) values
  ('op000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Hilton Pilot — 50 kiosks',       'ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','Negotiation', 480000, 75, '2026-09-30','Finalize MSA terms',            'US'),
  ('op000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Marriott Phase 1 — 20 kiosks',  'ac000001-0000-0000-0000-000000000002','co000001-0000-0000-0000-000000000003','Proposal',    220000, 50, '2026-10-15','Send revised proposal',         'US'),
  ('op000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','SFO Terminal 3 Pilot',           'ac000001-0000-0000-0000-000000000003','co000001-0000-0000-0000-000000000005','Discovery',   95000,  25, '2026-11-30','Schedule site walk',            'US'),
  ('op000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','UMich Campus Expansion',         'ac000001-0000-0000-0000-000000000004','co000001-0000-0000-0000-000000000006','Proposal',    140000, 45, '2026-10-01','ROI analysis deck due',         'US'),
  ('op000001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Google Workplace 2027',          'ac000001-0000-0000-0000-000000000006','co000001-0000-0000-0000-000000000007','Won',         320000, 100,'2026-06-30','Deployment kickoff scheduled',  'US'),
  ('op000001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','7-Eleven Smart Kiosk Test',      'ac000001-0000-0000-0000-000000000007','co000001-0000-0000-0000-000000000008','Discovery',   75000,  20, '2026-12-15','Concept presentation',          'US'),
  ('op000001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','MBS Full Deployment',            'ac000001-0000-0000-0000-000000000009','co000001-0000-0000-0000-000000000009','Won',         620000, 100,'2026-05-31','Live — support only',           'Asia'),
  ('op000001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Changi Terminal 1 Pilot',        'ac000001-0000-0000-0000-000000000010','co000001-0000-0000-0000-000000000011','Negotiation', 280000, 70, '2026-09-15','Contract review with legal',    'Asia'),
  ('op000001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','NUS Campus Kiosk Program',       'ac000001-0000-0000-0000-000000000011','co000001-0000-0000-0000-000000000012','Proposal',    165000, 40, '2026-10-31','Awaiting procurement approval', 'Asia'),
  ('op000001-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','Hyatt Chicago Pilot',            'ac000001-0000-0000-0000-000000000013','co000001-0000-0000-0000-000000000013','Discovery',   110000, 20, '2026-12-01','Initial discovery call',        'US'),
  ('op000001-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Compass Group Partnership',      'ac000001-0000-0000-0000-000000000014','co000001-0000-0000-0000-000000000014','Lost',        500000, 0,  '2026-07-31','—',                            'US'),
  ('op000001-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Singapore Airlines Lounge',      'ac000001-0000-0000-0000-000000000015','co000001-0000-0000-0000-000000000015','Proposal',    195000, 45, '2026-11-15','Send premium lounge case study','Asia');

-- Mark Won/Lost close dates
update opportunities set closed_at = now() - interval '60 days' where id = 'op000001-0000-0000-0000-000000000005';
update opportunities set closed_at = now() - interval '30 days' where id = 'op000001-0000-0000-0000-000000000007';
update opportunities set closed_at = now() - interval '15 days' where id = 'op000001-0000-0000-0000-000000000011';

-- ── Interactions ─────────────────────────────────────────────
insert into interactions (organization_id, type, occurred_at, account_id, contact_id, subject, notes, next_steps) values
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '40 days','ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','Hilton initial discovery call',                'Discussed kiosk needs across 3 properties. Strong fit.','Send capability deck'),
  ('00000000-0000-0000-0000-000000000001','Email',    now()-interval '35 days','ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','Capability deck sent to James',                'Deck sent. Awaiting feedback.','Follow up in 5 days'),
  ('00000000-0000-0000-0000-000000000001','Call',     now()-interval '25 days','ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','Follow-up call — Hilton proposal',              'James asked for ROI breakdown. Will send next week.','Prepare ROI model'),
  ('00000000-0000-0000-0000-000000000001','Demo',     now()-interval '15 days','ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','Hilton kiosk demo at McLean HQ',                'Very positive. Rachel (Procurement) joined. Want pilot in 2 properties.','Draft MSA'),
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '30 days','ac000001-0000-0000-0000-000000000002','co000001-0000-0000-0000-000000000003','Marriott intro meeting — Chicago',              'Michael interested. Wants to see case studies.','Send MBS case study'),
  ('00000000-0000-0000-0000-000000000001','Email',    now()-interval '20 days','ac000001-0000-0000-0000-000000000002','co000001-0000-0000-0000-000000000003','MBS case study shared with Marriott',           'Case study sent. Good initial feedback from Michael.','Schedule demo'),
  ('00000000-0000-0000-0000-000000000001','Call',     now()-interval '5 days', 'ac000001-0000-0000-0000-000000000002','co000001-0000-0000-0000-000000000003','Marriott proposal call',                        'Proposal reviewed. Angela joined. Some questions on menu customization.','Revise proposal'),
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '60 days','ac000001-0000-0000-0000-000000000009','co000001-0000-0000-0000-000000000009','MBS site visit — kiosk placement',             'Mapped 8 kiosk locations across mall and hotel.','Submit floor plan'),
  ('00000000-0000-0000-0000-000000000001','Demo',     now()-interval '45 days','ac000001-0000-0000-0000-000000000009','co000001-0000-0000-0000-000000000009','MBS live kiosk demo',                          'Demo successful. William confirmed green light.','Contract negotiation'),
  ('00000000-0000-0000-0000-000000000001','Call',     now()-interval '10 days','ac000001-0000-0000-0000-000000000010','co000001-0000-0000-0000-000000000011','Changi pilot scope call',                      'Benjamin confirmed Terminal 1 + 2 scope. Budget approved.','Send contract'),
  ('00000000-0000-0000-0000-000000000001','Email',    now()-interval '3 days', 'ac000001-0000-0000-0000-000000000010','co000001-0000-0000-0000-000000000011','Changi contract sent for review',              'Contract sent to Changi legal.','Follow up in 1 week'),
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '8 days', 'ac000001-0000-0000-0000-000000000003','co000001-0000-0000-0000-000000000005','SFO discovery meeting',                        'David gave tour of Terminal 3. High foot traffic. Great kiosk fit.','Prepare site survey report');

-- ── Tasks ────────────────────────────────────────────────────
insert into tasks (organization_id, title, type, priority, status, due_date, account_id, contact_id, opportunity_id) values
  ('00000000-0000-0000-0000-000000000001','Send revised MSA to Hilton legal',            'Email',        'High',   'Open',      current_date + 1,  'ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000002','op000001-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001','Follow up on Marriott proposal revision',     'Follow-up',    'High',   'Open',      current_date + 2,  'ac000001-0000-0000-0000-000000000002','co000001-0000-0000-0000-000000000003','op000001-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000001','Schedule SFO site survey',                   'Meeting',      'Normal', 'Open',      current_date + 5,  'ac000001-0000-0000-0000-000000000003','co000001-0000-0000-0000-000000000005','op000001-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000001','Send UMich ROI analysis deck',               'Send Proposal','High',   'Open',      current_date,      'ac000001-0000-0000-0000-000000000004','co000001-0000-0000-0000-000000000006','op000001-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000001','Changi — follow up with legal',              'Email',        'High',   'Open',      current_date + 7,  'ac000001-0000-0000-0000-000000000010','co000001-0000-0000-0000-000000000011','op000001-0000-0000-0000-000000000008'),
  ('00000000-0000-0000-0000-000000000001','NUS — follow up on procurement approval',    'Follow-up',    'Normal', 'Open',      current_date + 10, 'ac000001-0000-0000-0000-000000000011','co000001-0000-0000-0000-000000000012','op000001-0000-0000-0000-000000000009'),
  ('00000000-0000-0000-0000-000000000001','Call Thomas Nguyen — Radisson Blu',          'Call',         'High',   'Open',      current_date,      null, null, null),
  ('00000000-0000-0000-0000-000000000001','Send demo recording to Sophie Martin — IHG', 'Email',        'High',   'Open',      current_date - 1,  null, null, null),
  ('00000000-0000-0000-0000-000000000001','Follow up with Brian Foster — Omni',         'Follow-up',    'High',   'Open',      current_date - 2,  null, null, null),
  ('00000000-0000-0000-0000-000000000001','Prepare Hyatt discovery deck',               'Meeting',      'Normal', 'Open',      current_date + 14, 'ac000001-0000-0000-0000-000000000013','co000001-0000-0000-0000-000000000013','op000001-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000001','Send SQ Airlines lounge case study',         'Send Proposal','Normal', 'Open',      current_date + 3,  'ac000001-0000-0000-0000-000000000015','co000001-0000-0000-0000-000000000015','op000001-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000001','Hilton — confirm pilot property list',       'Call',         'High',   'Completed', current_date - 5,  'ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','op000001-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001','MBS — deployment kickoff call',              'Meeting',      'High',   'Completed', current_date - 20, 'ac000001-0000-0000-0000-000000000009','co000001-0000-0000-0000-000000000009','op000001-0000-0000-0000-000000000007');

-- Mark completed tasks
update tasks set completed_at = now() - interval '5 days'  where title = 'Hilton — confirm pilot property list';
update tasks set completed_at = now() - interval '20 days' where title = 'MBS — deployment kickoff call';
