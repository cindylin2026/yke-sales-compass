-- 023_operating_profile_new_segments.sql
--
-- 022 renamed 'Hospital' to 'Healthcare' and added 'Transit Station',
-- 'Manufacturing Facility', 'Laundromat'. The operating-hours trigger from
-- 020 still keys off the old segment names, so Healthcare accounts would
-- silently drop out of the 24/7 assumption. Transit Station is treated the
-- same as Airport (24/7 public transit hub) — a safe extrapolation.
-- Manufacturing Facility and Laundromat get no assumption yet (null) since
-- there's no operating-hours data for them — same treatment as Distributor/
-- Individual/Unknown, not guessed.

create or replace function compute_account_operating_profile()
returns trigger language plpgsql as $$
begin
  case new.segment
    when 'Healthcare', 'Hotel', 'Airport', 'Transit Station' then
      new.operating_hours_per_day := 24;
      new.operating_days_per_year := 365;
    when 'Office / Corporate' then
      new.operating_hours_per_day := 10;
      new.operating_days_per_year := 260;
    when 'Convenience Retail', 'Entertainment' then
      new.operating_hours_per_day := 12;
      new.operating_days_per_year := 365;
    when 'University' then
      new.operating_hours_per_day := 18;
      new.operating_days_per_year := 270;
    else
      new.operating_hours_per_day := null;
      new.operating_days_per_year := null;
  end case;
  return new;
end;
$$;

-- Recompute existing accounts (trigger only fires on future writes) —
-- needed so the renamed Healthcare rows get their profile back.
update accounts set segment = segment;
