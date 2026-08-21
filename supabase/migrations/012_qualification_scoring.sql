-- ============================================================
-- Migration 012: Automatic qualification scoring
--
-- Two changes matching the real sales process (Lead pipeline vs.
-- Outbound → direct Account creation):
--
-- 1. Leads: once compute_lead_score() (009) produces a score >= 50 for
--    a lead still sitting in "New", auto-promote it straight to "MQL" —
--    reps only ever work a queue of already-qualified leads, they don't
--    triage New ones by hand.
--
-- 2. Accounts: add the 6-criteria fit rubric (Foot Traffic, Utility
--    Readiness, Brand Alignment, Contract Complexity, Decision-Maker
--    Accessibility, Expansion Potential — the same rubric that used to
--    live only in the Master Database spreadsheet) as real columns, and
--    auto-compute account_fit_score from them (0-5 each, summed out of
--    30, scaled to 0-100) once a rep has filled in all six. This is for
--    Accounts created directly via Outbound (no originating Lead), so
--    there's no lead_score to lean on instead.
-- ============================================================

-- ── 1. Lead auto-promotion ──────────────────────────────────────
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

  -- Auto-qualify: a "New" lead that clears the bar moves straight to
  -- MQL, ready for outreach — the score IS the qualification gate.
  if new.lifecycle_stage = 'New' and new.lead_score >= 50 then
    new.lifecycle_stage := 'MQL';
  end if;

  return new;
end;
$$;
-- trigger already exists from 009_lead_lifecycle.sql, function replace is enough.

-- ── 2. Account fit-score rubric ──────────────────────────────────
alter table accounts add column if not exists foot_traffic_score int check (foot_traffic_score between 0 and 5);
alter table accounts add column if not exists utility_readiness_score int check (utility_readiness_score between 0 and 5);
alter table accounts add column if not exists brand_alignment_score int check (brand_alignment_score between 0 and 5);
alter table accounts add column if not exists contract_complexity_score int check (contract_complexity_score between 0 and 5);
alter table accounts add column if not exists decision_maker_accessibility_score int check (decision_maker_accessibility_score between 0 and 5);
alter table accounts add column if not exists expansion_potential_score int check (expansion_potential_score between 0 and 5);

create or replace function compute_account_fit_score()
returns trigger language plpgsql as $$
declare
  v_sum int;
begin
  if new.foot_traffic_score is not null
     and new.utility_readiness_score is not null
     and new.brand_alignment_score is not null
     and new.contract_complexity_score is not null
     and new.decision_maker_accessibility_score is not null
     and new.expansion_potential_score is not null
  then
    v_sum := new.foot_traffic_score + new.utility_readiness_score + new.brand_alignment_score
           + new.contract_complexity_score + new.decision_maker_accessibility_score
           + new.expansion_potential_score;
    new.account_fit_score := round(v_sum * 100.0 / 30);
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_compute_fit_score on accounts;
create trigger accounts_compute_fit_score
  before insert or update of
    foot_traffic_score, utility_readiness_score, brand_alignment_score,
    contract_complexity_score, decision_maker_accessibility_score, expansion_potential_score
  on accounts
  for each row execute function compute_account_fit_score();
