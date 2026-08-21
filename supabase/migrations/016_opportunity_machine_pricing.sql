-- ============================================================
-- Migration 016: Auto-estimate Opportunity Amount from machine count
--
-- Amount used to be a bare number a rep typed in by hand (default
-- $40,000, no formula behind it). Now reps enter Boba/Ramen machine
-- quantities and the system computes the 36-month TCV automatically:
--
--   amount = 36 * (boba_qty * $12,575 + ramen_qty * $7,000)
--          + (boba_qty + ramen_qty) * $10,000   -- one-time setup fee
-- ============================================================

alter table opportunities add column if not exists boba_machine_qty int not null default 0 check (boba_machine_qty >= 0);
alter table opportunities add column if not exists ramen_machine_qty int not null default 0 check (ramen_machine_qty >= 0);

create or replace function compute_opportunity_amount()
returns trigger language plpgsql as $$
begin
  new.amount := (36 * (new.boba_machine_qty * 12575 + new.ramen_machine_qty * 7000))
              + ((new.boba_machine_qty + new.ramen_machine_qty) * 10000);
  return new;
end;
$$;

drop trigger if exists opportunities_compute_amount on opportunities;
create trigger opportunities_compute_amount
  before insert or update of boba_machine_qty, ramen_machine_qty
  on opportunities
  for each row execute function compute_opportunity_amount();

-- convert_lead() now inserts machine quantities instead of a raw amount —
-- the trigger above computes the real number.
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
  select * into v_lead from leads where id = p_lead_id;
  if not found then
    raise exception 'Lead not found: %', p_lead_id;
  end if;

  v_org_id  := v_lead.organization_id;
  v_owner_id := coalesce(p_owner_id, v_lead.owner_id);

  if v_org_id != auth_org_id() then
    raise exception 'Unauthorized';
  end if;

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
      owner_id, stage, boba_machine_qty, ramen_machine_qty, probability,
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
      coalesce((p_opportunity->>'boba_machine_qty')::integer, 0),
      coalesce((p_opportunity->>'ramen_machine_qty')::integer, 0),
      coalesce((p_opportunity->>'probability')::integer, 20),
      (p_opportunity->>'expected_close_date')::date,
      p_opportunity->>'next_action',
      v_lead.region,
      v_lead.id
    )
    returning id into v_opportunity_id;

    if coalesce(p_opportunity->>'next_action', '') <> '' then
      insert into tasks (
        organization_id, title, type, priority, status, due_date,
        owner_id, lead_id, account_id, contact_id, opportunity_id, next_action
      )
      values (
        v_org_id,
        p_opportunity->>'next_action',
        'Follow-up',
        'Normal',
        'Open',
        coalesce((p_opportunity->>'next_action_due_date')::date, (current_date + interval '3 days')::date),
        v_owner_id,
        v_lead.id,
        v_account_id,
        v_contact_id,
        v_opportunity_id,
        p_opportunity->>'next_action'
      );
    end if;
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
