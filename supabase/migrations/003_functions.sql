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
