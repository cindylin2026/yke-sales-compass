-- 025_lead_region_reclassification.sql
--
-- Reviewed with Cindy (2026-08-19). Two problems, both caused by migration
-- 018's blanket backfill (old system only had 'US'/'Asia'):
--   1. The ~21 leads that were 'Asia' all landed in 'Unknown' — real
--      country wasn't guessable from the tag alone. Reviewed by company
--      name + email domain.
--   2. The ~1000 leads that were 'US' all landed in 'North America' —
--      but many are real international WIX-website inbound leads that
--      were just defaulted to 'US' by the old import, not actually
--      US-based. Reclassified strictly by email domain ccTLD (Cindy: "just
--      go by domain") — company-name-only signals (e.g. "Sdn Bhd" with a
--      gmail address, or "National Australia Bank" with no ccTLD) are
--      deliberately NOT touched here since they're not domain evidence;
--      those are a follow-up if Cindy wants them handled too.

-- ── Batch 1: was 'Unknown' (originally 'Asia') ──
update leads set region = 'North Asia' where region = 'Unknown' and (email ilike '%.jp' or email ilike '%.ne.jp' or email ilike '%.co.jp');
update leads set region = 'North Asia' where region = 'Unknown' and email ilike '%.cokr'; -- ENTAS — .co.kr, missing a dot
update leads set region = 'Southeast Asia' where region = 'Unknown' and company_name = 'Flavour Rich Pte Ltd';
update leads set region = 'Taiwan' where region = 'Unknown' and email ilike '%.tw';
update leads set region = 'North America' where region = 'Unknown' and email ilike '%.american.edu'; -- Stephen Blair / MCF Consulting
update leads set region = 'North America' where region = 'Unknown' and company_name = 'Murray Management LLC';
-- Left as Unknown intentionally, no reliable signal: cfeconn1, King & Co. & King Lin Prop,
-- MaCuVerse LLC, TheCapybaraCompany.

-- ── Batch 2: was 'North America', reclassified strictly by email ccTLD ──
update leads set region = 'Australia' where region = 'North America' and email ilike '%.au';
update leads set region = 'Australia' where region = 'North America' and email ilike '%.co.nz'; -- NZ folded into Australia, no separate NZ bucket in the taxonomy
update leads set region = 'UK' where region = 'North America' and email ilike '%.co.uk';
update leads set region = 'Taiwan' where region = 'North America' and email ilike '%.tw';
update leads set region = 'North Asia' where region = 'North America' and email ilike '%.hk';
update leads set region = 'North Asia' where region = 'North America' and email ilike '%@qq.com'; -- Tencent QQ Mail — China-specific webmail provider
update leads set region = 'Southeast Asia' where region = 'North America' and email ilike '%.sg';
update leads set region = 'Southeast Asia' where region = 'North America' and email ilike '%.com.ph';
update leads set region = 'Southeast Asia' where region = 'North America' and email ilike '%.co.th';
