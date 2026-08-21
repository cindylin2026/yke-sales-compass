-- ============================================================
-- Migration 008: Fix double-logged lead stage history
--
-- record_lead_stage_change (003_functions.sql) already auto-inserts a
-- lead_stage_history row on every leads.lifecycle_stage UPDATE, correctly
-- capturing old_stage/new_stage/changed_by — but it has no way to attach
-- a note. dbUpdateLeadStage (repository.ts) worked around that by doing
-- its own separate insert when a note was given (e.g. the Disqualify
-- button), which produced a SECOND, incomplete history row (no old_stage,
-- no changed_by) alongside the trigger's row for the same transition.
--
-- This RPC does the update and the note attachment in one transaction:
-- the trigger still creates the row, and we patch the note onto that
-- same row immediately after, in the same transaction — no duplicate,
-- no race condition.
-- ============================================================

create or replace function update_lead_stage(
  p_lead_id uuid,
  p_new_stage text,
  p_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old_stage text;
begin
  select lifecycle_stage into v_old_stage from leads where id = p_lead_id;

  update leads
  set lifecycle_stage = p_new_stage, updated_at = now()
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
