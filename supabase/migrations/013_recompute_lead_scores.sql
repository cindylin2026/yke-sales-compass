-- ============================================================
-- Migration 013: Force-recompute lead_score for existing leads
--
-- compute_lead_score() (009, updated by 012) only fires on INSERT or on
-- UPDATE OF the columns it reads (source, phone, title, company_domain,
-- last_contacted_at). Every lead currently in the table — the 20 Ottawa
-- leads and the ~1455 leads migrated from WIX-sourced accounts (011) —
-- was written before that trigger existed, so they're all still sitting
-- on the column default (50) and none of them got the auto-promote-to-
-- MQL check applied.
--
-- This is a one-time backfill: touching `source` on every row (to the
-- same value) is enough to make Postgres re-fire the trigger, which
-- recomputes lead_score and — since compute_lead_score() also contains
-- the "New" + score >= 50 → "MQL" auto-promotion — will move qualifying
-- leads to MQL right here, in the same statement.
-- ============================================================

do $$
declare
  v_before_mql int;
  v_after_mql int;
begin
  select count(*) into v_before_mql from leads where lifecycle_stage = 'MQL';

  update leads set source = source;

  select count(*) into v_after_mql from leads where lifecycle_stage = 'MQL';

  raise notice 'MQL count before: %, after: %', v_before_mql, v_after_mql;
end $$;
