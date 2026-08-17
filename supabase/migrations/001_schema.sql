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
