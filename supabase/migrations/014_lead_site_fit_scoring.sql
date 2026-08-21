-- ============================================================
-- Migration 014: MQL = site-fit scoring, SAL = outreach
--
-- Revised lifecycle semantics (matches the real process, not the
-- earlier placeholder one):
--   New  -> MQL : automatic, driven by lead_score (source/contact
--                 completeness) — unchanged from 009/012.
--   MQL         : NOT outreach. The rep scores the same 6-criteria
--                 fit rubric used on Accounts (Foot Traffic, Utility
--                 Readiness, Brand Alignment, Contract Complexity,
--                 Decision-Maker Accessibility, Expansion Potential)
--                 before ever making contact. Once all 6 are filled,
--                 the lead auto-promotes straight to SAL.
--   SAL         : the real outreach queue — reps call/email here.
--   SQL         : reached manually once outreach qualifies the lead;
--                 this is the "book a discovery call" queue.
--   Converted   : via convert_lead(), already gated to SQL in the UI.
-- ============================================================

alter table leads add column if not exists foot_traffic_score int check (foot_traffic_score between 0 and 5);
alter table leads add column if not exists utility_readiness_score int check (utility_readiness_score between 0 and 5);
alter table leads add column if not exists brand_alignment_score int check (brand_alignment_score between 0 and 5);
alter table leads add column if not exists contract_complexity_score int check (contract_complexity_score between 0 and 5);
alter table leads add column if not exists decision_maker_accessibility_score int check (decision_maker_accessibility_score between 0 and 5);
alter table leads add column if not exists expansion_potential_score int check (expansion_potential_score between 0 and 5);
alter table leads add column if not exists site_fit_score int check (site_fit_score between 0 and 100);

create or replace function compute_lead_site_fit_score()
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
    new.site_fit_score := round(v_sum * 100.0 / 30);

    -- All 6 criteria filled while sitting in MQL -> auto-promote to SAL.
    if new.lifecycle_stage = 'MQL' then
      new.lifecycle_stage := 'SAL';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_compute_site_fit_score on leads;
create trigger leads_compute_site_fit_score
  before insert or update of
    foot_traffic_score, utility_readiness_score, brand_alignment_score,
    contract_complexity_score, decision_maker_accessibility_score, expansion_potential_score
  on leads
  for each row execute function compute_lead_site_fit_score();
