-- ============================================================
-- Migration 015: Auto-disqualify leads that fail the site-fit bar
--
-- compute_lead_site_fit_score() (014) always promoted MQL -> SAL once
-- all 6 criteria were filled, regardless of how low the score was. Now:
-- site_fit_score < 40 -> auto-disqualify (reason: "Not ICP") instead of
-- promoting to SAL. Reps stop wasting outreach time on locations that
-- were already assessed as a poor fit.
-- ============================================================

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

    if new.lifecycle_stage = 'MQL' then
      if new.site_fit_score < 40 then
        new.lifecycle_stage := 'Disqualified';
        new.disqualify_reason := 'Not ICP';
      else
        new.lifecycle_stage := 'SAL';
      end if;
    end if;
  end if;
  return new;
end;
$$;
