-- 017_market_field_and_demo_stage.sql
--
-- From Amanda's (management) CRM revision notes:
--   1. Accounts and Leads need a "market" grouping that's finer-grained than
--      region (region is only US/Asia). Freeform for now — no fixed list was
--      given yet, so it's editable per-record via the Data Editor rather than
--      a locked enum.
--   2. The old process had a "site walk through" step that management wants
--      renamed to "Demo" and represented as a real Opportunity stage, sitting
--      between Discovery and Proposal.

alter table accounts add column if not exists market text;
alter table leads add column if not exists market text;

alter table opportunities drop constraint if exists opportunities_stage_check;
alter table opportunities add constraint opportunities_stage_check
  check (stage in ('Discovery','Demo','Proposal','Negotiation','Won','Lost'));
