-- 020_opportunity_revenue_range.sql
--
-- From Amanda's 2026-08-17 call: the machine licensing/lease formula
-- (migration 016) is a contract-value floor — it doesn't account for how
-- much retail revenue (boba/ramen unit sales) a location can actually
-- generate, which varies a lot by vertical:
--
--   Hospital / Hotel / Airport   → 24/7                    → 24 hrs/day, 365 days/yr
--   Office / Corporate           → Mon–Fri, 8am–6pm         → 10 hrs/day, 260 days/yr
--   Convenience Retail / Entertainment → 9am–9pm, 7 days/wk → 12 hrs/day, 365 days/yr
--   University                   → ~18 hrs/day, not year-round → 18 hrs/day, 270 days/yr
--   Distributor / Individual / Unknown → no assumption yet (null)
--
-- These operating-hours numbers are what Amanda described live on the
-- call as a starting point — she's still sending a worksheet with the
-- actual low/high retail-price (RSP) and daily-unit-sales assumptions
-- per vertical, and region-specific machine pricing (the $12,575/$7,000
-- unit costs are US-only, per her note). Those numbers are NOT guessed
-- here — avg_daily_units_low/high and retail_price_low/high default to
-- 0, so amount_low/amount_high just equal the base licensing amount
-- until real figures are entered. The scaffolding is ready for her
-- worksheet; the dollar assumptions are not invented.

-- ── accounts: operating profile, derived from segment ──
alter table accounts add column if not exists operating_hours_per_day numeric;
alter table accounts add column if not exists operating_days_per_year numeric;

create or replace function compute_account_operating_profile()
returns trigger language plpgsql as $$
begin
  case new.segment
    when 'Hospital', 'Hotel', 'Airport' then
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

drop trigger if exists accounts_compute_operating_profile on accounts;
create trigger accounts_compute_operating_profile
  before insert or update of segment
  on accounts
  for each row execute function compute_account_operating_profile();

-- Backfill existing accounts (trigger only fires on future writes).
update accounts set segment = segment;

-- ── opportunities: revenue range inputs + computed low/high ──
alter table opportunities add column if not exists avg_daily_units_low numeric not null default 0 check (avg_daily_units_low >= 0);
alter table opportunities add column if not exists avg_daily_units_high numeric not null default 0 check (avg_daily_units_high >= 0);
alter table opportunities add column if not exists retail_price_low numeric not null default 0 check (retail_price_low >= 0);
alter table opportunities add column if not exists retail_price_high numeric not null default 0 check (retail_price_high >= 0);
alter table opportunities add column if not exists amount_low numeric not null default 0;
alter table opportunities add column if not exists amount_high numeric not null default 0;

create or replace function compute_opportunity_amount()
returns trigger language plpgsql as $$
declare
  v_days_per_year numeric;
  v_machine_qty   numeric := new.boba_machine_qty + new.ramen_machine_qty;
  v_base          numeric;
begin
  v_base := (36 * (new.boba_machine_qty * 12575 + new.ramen_machine_qty * 7000))
          + (v_machine_qty * 10000);
  new.amount := v_base;

  select operating_days_per_year into v_days_per_year
  from accounts where id = new.account_id;

  new.amount_low  := v_base + (v_machine_qty * new.avg_daily_units_low  * new.retail_price_low  * coalesce(v_days_per_year, 0) * 3);
  new.amount_high := v_base + (v_machine_qty * new.avg_daily_units_high * new.retail_price_high * coalesce(v_days_per_year, 0) * 3);
  return new;
end;
$$;

drop trigger if exists opportunities_compute_amount on opportunities;
create trigger opportunities_compute_amount
  before insert or update of
    boba_machine_qty, ramen_machine_qty,
    avg_daily_units_low, avg_daily_units_high,
    retail_price_low, retail_price_high, account_id
  on opportunities
  for each row execute function compute_opportunity_amount();

-- Backfill existing opportunities (trigger only fires on future writes).
update opportunities set boba_machine_qty = boba_machine_qty;
