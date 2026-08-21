-- ============================================================
-- Migration 010: Lead Conversion detail fixes
--
-- The "Next action" a rep types during conversion (e.g. "Schedule
-- discovery call") was only ever stored as a text label on the new
-- Opportunity — it never became an actual task, so it silently never
-- showed up in Today's Follow-ups. This makes convert_lead() create a
-- real open task for it, due on the date the rep picked (default: 3
-- days out).
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

    -- Turn the "next action" text into a real, actionable task instead
    -- of a label nobody sees again.
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
