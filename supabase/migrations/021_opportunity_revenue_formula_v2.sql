-- 021_opportunity_revenue_formula_v2.sql
--
-- Real pricing from Cindy (2026-08-19), replacing the placeholder 020 formula:
--   Boba RSP:  $5.50 (conservative) – $7.00 (optimistic) — fixed menu price, not rep-editable.
--   Ramen RSP: $12.99 (conservative) – $14.99 (optimistic) — fixed menu price, not rep-editable.
--   Daily unit sales per machine: conservative 50 boba / 30 ramen, optimistic 100 boba / 75 ramen
--     — this DOES vary by site, so it stays rep-editable, pre-filled with these defaults.
--
-- 020 modeled boba+ramen as one blended daily-units × one blended RSP, which doesn't hold up
-- now that boba and ramen have very different price points — a mixed-machine opportunity would
-- get a distorted number. This splits the calculation per product and sums the two.
--
-- retail_price_low/high and avg_daily_units_low/high (020) are superseded and dropped —
-- RSP is now a fixed constant in the trigger function below, and unit-sales assumptions are
-- tracked separately per product.

alter table opportunities add column if not exists avg_daily_boba_units_low integer not null default 50 check (avg_daily_boba_units_low >= 0);
alter table opportunities add column if not exists avg_daily_boba_units_high integer not null default 100 check (avg_daily_boba_units_high >= 0);
alter table opportunities add column if not exists avg_daily_ramen_units_low integer not null default 30 check (avg_daily_ramen_units_low >= 0);
alter table opportunities add column if not exists avg_daily_ramen_units_high integer not null default 75 check (avg_daily_ramen_units_high >= 0);

create or replace function compute_opportunity_amount()
returns trigger language plpgsql as $$
declare
  v_days_per_year numeric;
  v_base          numeric;
  boba_rsp_low    constant numeric := 5.50;
  boba_rsp_high   constant numeric := 7.00;
  ramen_rsp_low   constant numeric := 12.99;
  ramen_rsp_high  constant numeric := 14.99;
begin
  v_base := (36 * (new.boba_machine_qty * 12575 + new.ramen_machine_qty * 7000))
          + ((new.boba_machine_qty + new.ramen_machine_qty) * 10000);
  new.amount := v_base;

  select operating_days_per_year into v_days_per_year
  from accounts where id = new.account_id;
  v_days_per_year := coalesce(v_days_per_year, 0);

  new.amount_low := v_base
    + (new.boba_machine_qty * new.avg_daily_boba_units_low * boba_rsp_low * v_days_per_year * 3)
    + (new.ramen_machine_qty * new.avg_daily_ramen_units_low * ramen_rsp_low * v_days_per_year * 3);

  new.amount_high := v_base
    + (new.boba_machine_qty * new.avg_daily_boba_units_high * boba_rsp_high * v_days_per_year * 3)
    + (new.ramen_machine_qty * new.avg_daily_ramen_units_high * ramen_rsp_high * v_days_per_year * 3);

  return new;
end;
$$;

drop trigger if exists opportunities_compute_amount on opportunities;
create trigger opportunities_compute_amount
  before insert or update of
    boba_machine_qty, ramen_machine_qty,
    avg_daily_boba_units_low, avg_daily_boba_units_high,
    avg_daily_ramen_units_low, avg_daily_ramen_units_high,
    account_id
  on opportunities
  for each row execute function compute_opportunity_amount();

-- Recompute existing rows now that the formula changed.
update opportunities set boba_machine_qty = boba_machine_qty;

alter table opportunities drop column if exists retail_price_low;
alter table opportunities drop column if exists retail_price_high;
alter table opportunities drop column if exists avg_daily_units_low;
alter table opportunities drop column if exists avg_daily_units_high;
