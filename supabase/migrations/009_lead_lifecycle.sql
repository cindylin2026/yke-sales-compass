-- ============================================================
-- Migration 009: Leads Lifecycle — disqualify reason, auto lead
-- scoring, and keeping last_contacted_at truthful.
-- ============================================================

-- ── Disqualify reason ──────────────────────────────────────────
alter table leads add column if not exists disqualify_reason text
  check (disqualify_reason in (
    'Budget', 'Not ICP', 'No Response', 'Lost to Competitor',
    'Bad Timing', 'Duplicate', 'Other'
  ));

-- Extend update_lead_stage (008) to also set the reason atomically
-- when disqualifying (or clear it on any other transition).
create or replace function update_lead_stage(
  p_lead_id uuid,
  p_new_stage text,
  p_note text default null,
  p_disqualify_reason text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old_stage text;
begin
  select lifecycle_stage into v_old_stage from leads where id = p_lead_id;

  update leads
  set lifecycle_stage = p_new_stage,
      disqualify_reason = case when p_new_stage = 'Disqualified' then p_disqualify_reason else null end,
      updated_at = now()
  where id = p_lead_id;

  if p_note is not null and v_old_stage is distinct from p_new_stage then
    update lead_stage_history
    set note = p_note
    where lead_id = p_lead_id
      and changed_at = (
        select max(changed_at) from lead_stage_history where lead_id = p_lead_id
      );
  end if;
end;
$$;

-- ── Automatic lead scoring ──────────────────────────────────────
-- Replaces the manual 0-100 slider: score is a deterministic function
-- of source quality + how much we know about the prospect. Recomputes
-- whenever any input column changes, so it stays correct over time
-- (e.g. once last_contacted_at gets set, score goes up automatically).
create or replace function compute_lead_score()
returns trigger language plpgsql as $$
declare
  v_score int := 0;
begin
  v_score := v_score + case new.source
    when 'Referral' then 40
    when 'Trade Show' then 36
    when 'Partner' then 34
    when 'Event Registration' then 32
    when 'Wix Website Inquiry' then 28
    when 'LinkedIn' then 22
    when 'Outbound' then 18
    when 'Other Campaign' then 16
    when 'Manual Entry' then 14
    when 'Social Media' then 10
    else 10
  end;

  if new.phone is not null and length(trim(new.phone)) > 0 then
    v_score := v_score + 15;
  end if;

  if new.title is not null and length(trim(new.title)) > 0 then
    v_score := v_score + 15;
  end if;

  if new.company_domain is not null and length(trim(new.company_domain)) > 0 then
    v_score := v_score + 15;
  end if;

  if new.last_contacted_at is not null then
    v_score := v_score + 15;
  end if;

  new.lead_score := least(100, greatest(0, v_score));
  return new;
end;
$$;

drop trigger if exists leads_compute_score on leads;
create trigger leads_compute_score
  before insert or update of source, phone, title, company_domain, last_contacted_at
  on leads
  for each row execute function compute_lead_score();

-- ── Keep last_contacted_at truthful ─────────────────────────────
-- Logging an interaction against a lead should count as contact —
-- previously nothing ever updated this column, so the "not contacted
-- in 48h" SLA exception list (selectors.ts: exceptions()) would flag
-- a lead forever even after reps called/emailed them.
create or replace function touch_lead_last_contacted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.lead_id is not null then
    update leads
    set last_contacted_at = greatest(coalesce(last_contacted_at, new.occurred_at), new.occurred_at)
    where id = new.lead_id;
  end if;
  return new;
end;
$$;

drop trigger if exists interactions_touch_lead on interactions;
create trigger interactions_touch_lead
  after insert on interactions
  for each row execute function touch_lead_last_contacted();
