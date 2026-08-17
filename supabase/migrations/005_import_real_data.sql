-- ============================================================
-- YKE Sales Compass — Real Data Import
-- Migration 005: Import from Google Sheets
-- Run AFTER 001-004 migrations and after creating auth user
-- ============================================================

-- ── Organization (already seeded in 004, skip if exists) ─────
insert into organizations (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Yo-Kai Express')
  on conflict (id) do nothing;

-- ── Clear demo seed data, keep org ───────────────────────────
delete from audit_logs;
delete from opportunity_stage_history;
delete from lead_stage_history;
delete from tasks;
delete from interactions;
delete from opportunities;
delete from contacts;
delete from leads;
delete from accounts;
delete from campaigns;
