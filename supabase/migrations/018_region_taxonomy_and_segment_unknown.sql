-- 018_region_taxonomy_and_segment_unknown.sql
--
-- From the 2026-08-17 call with Amanda (management):
--   1. Region needs to be more granular than US/Asia so Andy/Amanda can
--      filter down to a specific market (e.g. "just Hong Kong", "just
--      Taiwan"). New taxonomy, per her explicit list on the call:
--        North America, Europe, UK (kept separate from Europe — Brexit),
--        Australia, North Asia, Southeast Asia, Taiwan (kept separate —
--        "Taiwan is Taiwan"), Unknown.
--      All existing region='US' rows become 'North America' (100% of
--      current account/lead data is US-based). Existing region='Asia'
--      rows become 'Unknown' rather than guessed, since we can't safely
--      tell North Asia / Southeast Asia / Taiwan apart from the region
--      tag alone — those ~10 leads need a quick manual re-tag.
--   2. Segment (vertical) needs an 'Unknown' value: "without knowing
--      then we put unknown ... once we know we will update it." Also
--      adding 'Individual' per her vertical list (hospitality, healthcare,
--      higher education, corporate, individual, unknown).
--
-- NOTE on ordering (2nd fix): the new constraint list doesn't include
-- 'US'/'Asia' at all, so adding it BEFORE the backfill rejects the
-- existing rows, and adding it AFTER trying to backfill under the OLD
-- constraint rejects the new values ('North America' etc). The only
-- order that works: drop the old constraint first (column goes
-- unconstrained), backfill, THEN add the final constraint.

-- ── profiles.region ──
alter table profiles alter column region drop default;
alter table profiles drop constraint if exists profiles_region_check;
update profiles set region = 'North America' where region = 'US';
update profiles set region = 'Unknown' where region = 'Asia';
alter table profiles add constraint profiles_region_check
  check (region in ('North America','Europe','UK','Australia','North Asia','Southeast Asia','Taiwan','Unknown'));
alter table profiles alter column region set default 'Unknown';

-- ── campaigns.region ──
alter table campaigns alter column region drop default;
alter table campaigns drop constraint if exists campaigns_region_check;
update campaigns set region = 'North America' where region = 'US';
update campaigns set region = 'Unknown' where region = 'Asia';
alter table campaigns add constraint campaigns_region_check
  check (region in ('North America','Europe','UK','Australia','North Asia','Southeast Asia','Taiwan','Unknown','Global'));
alter table campaigns alter column region set default 'Global';

-- ── accounts.region ──
alter table accounts drop constraint if exists accounts_region_check;
update accounts set region = 'North America' where region = 'US';
update accounts set region = 'Unknown' where region = 'Asia';
alter table accounts add constraint accounts_region_check
  check (region in ('North America','Europe','UK','Australia','North Asia','Southeast Asia','Taiwan','Unknown'));

-- ── leads.region ──
alter table leads alter column region drop default;
alter table leads drop constraint if exists leads_region_check;
update leads set region = 'North America' where region = 'US';
update leads set region = 'Unknown' where region = 'Asia';
alter table leads add constraint leads_region_check
  check (region in ('North America','Europe','UK','Australia','North Asia','Southeast Asia','Taiwan','Unknown'));
alter table leads alter column region set default 'Unknown';

-- ── opportunities.region ──
alter table opportunities drop constraint if exists opportunities_region_check;
update opportunities set region = 'North America' where region = 'US';
update opportunities set region = 'Unknown' where region = 'Asia';
alter table opportunities add constraint opportunities_region_check
  check (region in ('North America','Europe','UK','Australia','North Asia','Southeast Asia','Taiwan','Unknown'));

-- ── accounts.segment: add 'Unknown' and 'Individual' ──
alter table accounts drop constraint if exists accounts_segment_check;
alter table accounts add constraint accounts_segment_check
  check (segment in (
    'Hotel','Airport','University','Hospital','Office / Corporate',
    'Convenience Retail','Distributor','Entertainment','Individual','Unknown'
  ));
