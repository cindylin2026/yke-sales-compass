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

-- ── Campaigns ────────────────────────────────────────────────
insert into campaigns (id, organization_id, name, channel, region, start_date, end_date, budget, is_active) values
  ('ca000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','HITEC 2026 Chicago',     'Event',      'US',     '2026-06-16','2026-06-19', 28000,  true),
  ('ca000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','LinkedIn Q3 US',         'Paid Social','US',     '2026-07-01', null,        15000,  true),
  ('ca000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Wix Website Inbound',    'Website',    'Global', '2026-01-01', null,        0,      true),
  ('ca000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Asia F&B Summit 2026',   'Event',      'Asia',   '2026-09-10','2026-09-12', 22000,  true),
  ('ca000001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Partner Referral US Q3', 'Partner',    'US',     '2026-07-01', null,        5000,   true),
  ('ca000001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','NRA Show 2026',          'Trade Show', 'US',     '2026-05-17','2026-05-20', 35000,  false),
  ('ca000001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','Singapore HX Expo',      'Event',      'Asia',   '2026-04-08','2026-04-10', 18000,  false),
  ('ca000001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Email Nurture US',       'Email',      'US',     '2026-06-01', null,        3000,   true);

-- ── Accounts ─────────────────────────────────────────────────
insert into accounts (id, organization_id, name, domain, segment, region, country, city, status, account_fit_score, employee_count, locations_count) values
  ('ac000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Hilton Hotels & Resorts',              'hilton.com',         'Hotel',              'US',   'United States','McLean',        'Customer',        95, 150000, 600),
  ('ac000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Marriott International',               'marriott.com',       'Hotel',              'US',   'United States','Bethesda',      'Active Prospect', 92, 180000, 500),
  ('ac000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','San Francisco International Airport',  'flysfo.com',         'Airport',            'US',   'United States','San Francisco', 'Active Prospect', 88, 2000,   1),
  ('ac000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','University of Michigan',               'umich.edu',          'University',         'US',   'United States','Ann Arbor',     'Active Prospect', 85, 48000,  40),
  ('ac000001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Cedars-Sinai Medical Center',          'cedars-sinai.org',   'Hospital',           'US',   'United States','Los Angeles',   'Target',          80, 14000,  3),
  ('ac000001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','Google LLC',                           'google.com',         'Office / Corporate', 'US',   'United States','Mountain View', 'Customer',        90, 180000, 50),
  ('ac000001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','7-Eleven Inc.',                        '7-eleven.com',       'Convenience Retail', 'US',   'United States','Irving',        'Active Prospect', 75, 8000,   13000),
  ('ac000001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Aramark Corporation',                  'aramark.com',        'Distributor',        'US',   'United States','Philadelphia',  'Target',          70, 280000, 500),
  ('ac000001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','Marina Bay Sands',                     'marinabaysands.com', 'Hotel',              'Asia', 'Singapore',    'Singapore',     'Customer',        94, 10000,  1),
  ('ac000001-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','Changi Airport Group',                 'changiairport.com',  'Airport',            'Asia', 'Singapore',    'Singapore',     'Active Prospect', 91, 5000,   1),
  ('ac000001-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','National University of Singapore',     'nus.edu.sg',         'University',         'Asia', 'Singapore',    'Singapore',     'Active Prospect', 83, 14000,  4),
  ('ac000001-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Sands Expo & Convention Centre',       'sandscasino.com',    'Entertainment',      'Asia', 'Singapore',    'Singapore',     'Target',          78, 6000,   1),
  ('ac000001-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','Hyatt Corporation',                    'hyatt.com',          'Hotel',              'US',   'United States','Chicago',       'Target',          87, 100000, 300),
  ('ac000001-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000001','Compass Group',                        'compass-group.com',  'Distributor',        'US',   'United States','Charlotte',     'Target',          72, 600000, 2000),
  ('ac000001-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000001','Singapore Airlines',                   'singaporeair.com',   'Airport',            'Asia', 'Singapore',    'Singapore',     'Target',          82, 27000,  5);

-- ── Contacts ─────────────────────────────────────────────────
insert into contacts (id, organization_id, account_id, first_name, last_name, title, email, phone, is_primary) values
  ('co000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000001','James',    'Whitfield','VP F&B Operations',            'james.whitfield@hilton.com',     '+1-703-555-0101',true),
  ('co000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000001','Rachel',   'Torres',    'Director of Procurement',       'r.torres@hilton.com',            '+1-703-555-0102',false),
  ('co000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000002','Michael',  'Chen',      'Head of Restaurant Operations', 'm.chen@marriott.com',            '+1-301-555-0201',true),
  ('co000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000002','Angela',   'Park',      'F&B Innovation Manager',        'a.park@marriott.com',            '+1-301-555-0202',false),
  ('co000001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000003','David',    'Kim',       'Director of Concessions',       'd.kim@flysfo.com',               '+1-650-555-0301',true),
  ('co000001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000004','Jennifer', 'Liu',       'Director of Dining Services',   'j.liu@umich.edu',                '+1-734-555-0401',true),
  ('co000001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000006','Kevin',    'Zhang',     'Workplace Services Lead',       'k.zhang@google.com',             '+1-650-555-0601',true),
  ('co000001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000007','Sandra',   'Lee',       'VP Foodservice Innovation',     's.lee@7-eleven.com',             '+1-972-555-0701',true),
  ('co000001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000009','William',  'Tan',       'F&B Operations Director',       'w.tan@marinabaysands.com',       '+65-6555-0901',true),
  ('co000001-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000009','Priya',    'Nair',      'Head of Concierge Services',    'p.nair@marinabaysands.com',      '+65-6555-0902',false),
  ('co000001-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000010','Benjamin', 'Lim',       'VP Commercial',                 'b.lim@changiairport.com',        '+65-6555-1001',true),
  ('co000001-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000011','Amanda',   'Yeo',       'Campus Dining Director',        'a.yeo@nus.edu.sg',               '+65-6555-1101',true),
  ('co000001-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000013','Robert',   'Hayes',     'VP Food & Beverage',            'r.hayes@hyatt.com',              '+1-312-555-1301',true),
  ('co000001-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000014','Christine','Wong',      'SVP Strategy',                  'c.wong@compass-group.com',       '+1-704-555-1401',true),
  ('co000001-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000001','ac000001-0000-0000-0000-000000000015','Aaron',    'Ng',        'Lounge Operations Manager',     'a.ng@singaporeair.com',          '+65-6555-1501',true);

-- ── Leads ────────────────────────────────────────────────────
insert into leads (id, organization_id, first_name, last_name, email, phone, title, company_name, company_domain, region, source, source_detail, campaign_id, lifecycle_stage, lead_score, notes) values
  ('le000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Thomas',    'Nguyen',    't.nguyen@radissonblu.com',       '+1-312-555-2001','Director of Operations',     'Radisson Blu Chicago',           'radissonblu.com',     'US',  'Event Registration', 'HITEC 2026',            'ca000001-0000-0000-0000-000000000001','SQL', 88,'Met at HITEC — running 3 hotels, keen on automation. Demo scheduled.'),
  ('le000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Mei',       'Sasaki',    'mei.sasaki@narita-airport.jp',   '+81-476-555-2002','F&B Concessions Manager',   'Narita International Airport',   'narita-airport.jp',   'Asia','Event Registration', 'Asia F&B Summit',       'ca000001-0000-0000-0000-000000000004','MQL', 75,'Interested in kiosk deployment across 4 terminals.'),
  ('le000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Carlos',    'Rivera',    'c.rivera@usc.edu',               '+1-213-555-2003','VP Student Services',        'University of Southern California','usc.edu',            'US',  'Wix Website Inquiry','Homepage contact form',  'ca000001-0000-0000-0000-000000000003','New', 62,'Looking for automated dining solutions for 3 campus locations.'),
  ('le000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Sophie',    'Martin',    's.martin@ihg.com',               '+44-20-555-2004','Group F&B Director',         'IHG Hotels & Resorts',           'ihg.com',             'US',  'LinkedIn',           'LinkedIn InMail outreach','ca000001-0000-0000-0000-000000000002','SAL', 81,'Responded to LinkedIn. Has budget for pilot in Q4. Needs ROI data.'),
  ('le000001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Raj',       'Patel',     'r.patel@mountelizabeth.com.sg',  '+65-6555-2005', 'Head of Patient Services',   'Mount Elizabeth Hospital',       'mountelizabeth.com.sg','Asia','Referral',           'Referred by MBS team',  'ca000001-0000-0000-0000-000000000005','New', 70,'Warm referral from Marina Bay Sands. Initial interest in pilot.'),
  ('le000001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','Lisa',      'Huang',     'l.huang@ntu.edu.sg',             '+65-6555-2006', 'Facilities Director',        'Nanyang Technological University','ntu.edu.sg',          'Asia','Event Registration', 'Asia F&B Summit',       'ca000001-0000-0000-0000-000000000004','MQL', 73,'NTU has 30K students. Very interested in high-volume automation.'),
  ('le000001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','Brian',     'Foster',    'b.foster@omnihotels.com',        '+1-214-555-2007','Regional VP Operations',     'Omni Hotels & Resorts',          'omnihotels.com',      'US',  'Trade Show',         'NRA Show 2026',         'ca000001-0000-0000-0000-000000000006','SQL', 85,'Strong fit. Visited booth twice at NRA. Wants proposal by Aug 30.'),
  ('le000001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Yuna',      'Kim',       'yuna.kim@lottehotel.com',        '+82-2-555-2008', 'F&B Innovation Lead',        'Lotte Hotel Seoul',              'lottehotel.com',      'Asia','LinkedIn',           'LinkedIn connection',   'ca000001-0000-0000-0000-000000000002','New', 65,'Korean market opportunity. Initial outreach.'),
  ('le000001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','Derek',     'Walsh',     'd.walsh@unlv.edu',               '+1-702-555-2009','Campus Dining Director',     'UNLV',                           'unlv.edu',            'US',  'Outbound',           'Cold outreach sequence', null,                                  'New', 55,'Potential for campus kiosk program. No response yet.'),
  ('le000001-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','Priya',     'Singh',     'p.singh@tataconsultancy.in',     '+91-22-555-2010','Head of Workplace Experience','Tata Consultancy Services',     'tcs.com',             'Asia','Partner',            'Sodexo partner referral','ca000001-0000-0000-0000-000000000005','SAL', 79,'Partner intro via Sodexo. 50+ office locations in Asia.'),
  ('le000001-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Marcus',    'Johnson',   'm.johnson@amfoodco.com',         '+1-404-555-2011','Director of Vending',        'American Food Co',               'amfoodco.com',        'US',  'Wix Website Inquiry','Website inquiry form',  'ca000001-0000-0000-0000-000000000003','MQL', 68,'Vending operator interested in smart kiosk expansion.'),
  ('le000001-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Aiyana',    'Holt',      'a.holt@stanfordhealth.org',      '+1-650-555-2012','Patient Experience Manager', 'Stanford Health Care',           'stanfordhealth.org',  'US',  'Referral',           'Cedars-Sinai intro',    'ca000001-0000-0000-0000-000000000005','New', 72,'Hospital segment — warm referral. High-traffic cafeteria.'),
  ('le000001-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','Hiroshi',   'Tanaka',    'h.tanaka@tokyu-hotels.co.jp',    '+81-3-555-2013', 'VP F&B',                     'Tokyu Hotels',                   'tokyu-hotels.co.jp',  'Asia','Event Registration', 'Asia F&B Summit',       'ca000001-0000-0000-0000-000000000004','MQL', 76,'Japan market. Multiple urban hotel properties.'),
  ('le000001-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000001','Fatima',    'Al-Hassan', 'f.alhassan@qatarairways.com',    '+974-555-2014',  'Lounge Operations Director', 'Qatar Airways',                  'qatarairways.com',    'Asia','Outbound',           'Senior AE outreach',    null,                                  'New', 60,'Premium lounge automation opportunity. Long sales cycle expected.'),
  ('le000001-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000001','James',     'O''Brien',  'j.obrien@sodexo.com',            '+1-301-555-2015','SVP Growth',                  'Sodexo North America',           'sodexo.com',          'US',  'Event Registration', 'HITEC 2026',            'ca000001-0000-0000-0000-000000000001','SAL', 84,'Sodexo is a major potential distributor partner. Escalate to manager.'),
  ('le000001-0000-0000-0000-000000000016','00000000-0000-0000-0000-000000000001','Wei',       'Chen',      'w.chen@pekingairport.com',       '+86-10-555-2016','Concessions Director',       'Beijing Capital Airport',        'pekingairport.com',   'Asia','Social Media',       'WeChat outreach',       null,                                  'New', 58,'Interested via WeChat. Early stage. China market exploration.'),
  ('le000001-0000-0000-0000-000000000017','00000000-0000-0000-0000-000000000001','Patricia',  'Moore',     'p.moore@caesars.com',            '+1-702-555-2017','VP Entertainment Dining',    'Caesars Entertainment',          'caesars.com',         'US',  'Outbound',           'Outbound sequence',     null,                                  'New', 63,'High-volume entertainment venue. Strong fit if they bite.'),
  ('le000001-0000-0000-0000-000000000018','00000000-0000-0000-0000-000000000001','Siddharth', 'Kapoor',    's.kapoor@oberoihotels.com',      '+91-11-555-2018','Group Operations Director',  'The Oberoi Group',               'oberoihotels.com',    'Asia','LinkedIn',           'LinkedIn InMail',       'ca000001-0000-0000-0000-000000000002','MQL', 77,'Luxury hotel group in India. 30+ properties. Strong interest.'),
  ('le000001-0000-0000-0000-000000000019','00000000-0000-0000-0000-000000000001','Ashley',    'Turner',    'a.turner@hyve.com',              '+1-617-555-2019','Operations Analyst',          'Hyve Group',                     'hyve.com',            'US',  'Wix Website Inquiry','Website inquiry',       'ca000001-0000-0000-0000-000000000003','New', 51,'Low score, just exploring. Follow up in 2 weeks.'),
  ('le000001-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001','Daniel',    'Fox',       'd.fox@mgmresorts.com',           '+1-702-555-2020','SVP Food & Beverage',        'MGM Resorts International',      'mgmresorts.com',      'US',  'Event Registration', 'HITEC 2026',            'ca000001-0000-0000-0000-000000000001','SQL', 91,'Top lead from HITEC. MGM has 30+ properties. Demo next Tuesday.');

-- ── Lead stage history ────────────────────────────────────────
insert into lead_stage_history (lead_id, old_stage, new_stage, changed_at) values
  ('le000001-0000-0000-0000-000000000001', null,  'New', now() - interval '45 days'),
  ('le000001-0000-0000-0000-000000000001', 'New', 'MQL', now() - interval '30 days'),
  ('le000001-0000-0000-0000-000000000001', 'MQL', 'SAL', now() - interval '20 days'),
  ('le000001-0000-0000-0000-000000000001', 'SAL', 'SQL', now() - interval '10 days'),
  ('le000001-0000-0000-0000-000000000004', null,  'New', now() - interval '35 days'),
  ('le000001-0000-0000-0000-000000000004', 'New', 'MQL', now() - interval '25 days'),
  ('le000001-0000-0000-0000-000000000004', 'MQL', 'SAL', now() - interval '12 days'),
  ('le000001-0000-0000-0000-000000000006', null,  'New', now() - interval '28 days'),
  ('le000001-0000-0000-0000-000000000006', 'New', 'MQL', now() - interval '14 days'),
  ('le000001-0000-0000-0000-000000000007', null,  'New', now() - interval '40 days'),
  ('le000001-0000-0000-0000-000000000007', 'New', 'MQL', now() - interval '28 days'),
  ('le000001-0000-0000-0000-000000000007', 'MQL', 'SAL', now() - interval '18 days'),
  ('le000001-0000-0000-0000-000000000007', 'SAL', 'SQL', now() - interval '8 days'),
  ('le000001-0000-0000-0000-000000000010', null,  'New', now() - interval '32 days'),
  ('le000001-0000-0000-0000-000000000010', 'New', 'MQL', now() - interval '22 days'),
  ('le000001-0000-0000-0000-000000000010', 'MQL', 'SAL', now() - interval '11 days'),
  ('le000001-0000-0000-0000-000000000013', null,  'New', now() - interval '25 days'),
  ('le000001-0000-0000-0000-000000000013', 'New', 'MQL', now() - interval '12 days'),
  ('le000001-0000-0000-0000-000000000015', null,  'New', now() - interval '38 days'),
  ('le000001-0000-0000-0000-000000000015', 'New', 'MQL', now() - interval '26 days'),
  ('le000001-0000-0000-0000-000000000015', 'MQL', 'SAL', now() - interval '15 days'),
  ('le000001-0000-0000-0000-000000000018', null,  'New', now() - interval '20 days'),
  ('le000001-0000-0000-0000-000000000018', 'New', 'MQL', now() - interval '10 days'),
  ('le000001-0000-0000-0000-000000000020', null,  'New', now() - interval '20 days'),
  ('le000001-0000-0000-0000-000000000020', 'New', 'MQL', now() - interval '14 days'),
  ('le000001-0000-0000-0000-000000000020', 'MQL', 'SAL', now() - interval '9 days'),
  ('le000001-0000-0000-0000-000000000020', 'SAL', 'SQL', now() - interval '4 days');

-- ── Opportunities ─────────────────────────────────────────────
insert into opportunities (id, organization_id, name, account_id, primary_contact_id, stage, amount, probability, expected_close_date, next_action, next_action_due_date, region, notes) values
  ('op000001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Hilton Pilot — 50 kiosks',      'ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','Negotiation', 480000, 75, '2026-09-30','Finalize MSA terms',             '2026-08-20','US',  'Pilot across 2 properties. Legal reviewing MSA now.'),
  ('op000001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Marriott Phase 1 — 20 kiosks', 'ac000001-0000-0000-0000-000000000002','co000001-0000-0000-0000-000000000003','Proposal',    220000, 50, '2026-10-15','Send revised proposal',          '2026-08-22','US',  'Awaiting revised proposal with menu customization options.'),
  ('op000001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','SFO Terminal 3 Pilot',          'ac000001-0000-0000-0000-000000000003','co000001-0000-0000-0000-000000000005','Discovery',    95000, 25, '2026-11-30','Schedule site walk',             '2026-08-28','US',  'High foot traffic Terminal 3. Needs ADA compliance review.'),
  ('op000001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','UMich Campus Expansion',        'ac000001-0000-0000-0000-000000000004','co000001-0000-0000-0000-000000000006','Proposal',    140000, 45, '2026-10-01','ROI analysis deck due',          '2026-08-17','US',  '40 dining locations on campus. Procurement committee reviews Q4.'),
  ('op000001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Google Workplace 2027',         'ac000001-0000-0000-0000-000000000006','co000001-0000-0000-0000-000000000007','Won',          320000,100, '2026-06-30','Deployment kickoff scheduled',   null,        'US',  'Signed. 15 kiosks across 3 campuses. Deployment starts Sep.'),
  ('op000001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','7-Eleven Smart Kiosk Test',     'ac000001-0000-0000-0000-000000000007','co000001-0000-0000-0000-000000000008','Discovery',    75000, 20, '2026-12-15','Concept presentation',           '2026-09-05','US',  '3-store pilot concept. Sandra wants to see throughput benchmarks.'),
  ('op000001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','MBS Full Deployment',           'ac000001-0000-0000-0000-000000000009','co000001-0000-0000-0000-000000000009','Won',          620000,100, '2026-05-31','Live — support only',            null,        'Asia','8 kiosks live across hotel and mall. Performing above target.'),
  ('op000001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Changi Terminal 1 Pilot',       'ac000001-0000-0000-0000-000000000010','co000001-0000-0000-0000-000000000011','Negotiation', 280000, 70, '2026-09-15','Contract review with legal',     '2026-08-24','Asia','4 kiosks Terminal 1. Benjamin confirmed budget. Awaiting legal.'),
  ('op000001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','NUS Campus Kiosk Program',      'ac000001-0000-0000-0000-000000000011','co000001-0000-0000-0000-000000000012','Proposal',    165000, 40, '2026-10-31','Awaiting procurement approval',  '2026-09-01','Asia','6 kiosks across 4 faculties. In procurement review cycle.'),
  ('op000001-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','Hyatt Chicago Pilot',           'ac000001-0000-0000-0000-000000000013','co000001-0000-0000-0000-000000000013','Discovery',   110000, 20, '2026-12-01','Initial discovery call',         '2026-08-25','US',  'Robert introduced via HITEC referral. Early stage discovery.'),
  ('op000001-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Compass Group Partnership',     'ac000001-0000-0000-0000-000000000014','co000001-0000-0000-0000-000000000014','Lost',         500000,  0, '2026-07-31', null,                            null,        'US',  'Lost to competitor. Christine cited pricing and integration complexity.'),
  ('op000001-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Singapore Airlines Lounge',     'ac000001-0000-0000-0000-000000000015','co000001-0000-0000-0000-000000000015','Proposal',    195000, 45, '2026-11-15','Send premium lounge case study', '2026-08-20','Asia','Changi T3 Krisflyer lounge. High-end F&B automation use case.');

-- Close dates for Won/Lost deals
update opportunities set closed_at = now() - interval '60 days' where id = 'op000001-0000-0000-0000-000000000005';
update opportunities set closed_at = now() - interval '30 days' where id = 'op000001-0000-0000-0000-000000000007';
update opportunities set closed_at = now() - interval '15 days' where id = 'op000001-0000-0000-0000-000000000011';

-- ── Opportunity stage history ─────────────────────────────────
insert into opportunity_stage_history (opportunity_id, old_stage, new_stage, old_amount, new_amount, changed_at) values
  ('op000001-0000-0000-0000-000000000001', null,          'Discovery',   null,   480000, now() - interval '55 days'),
  ('op000001-0000-0000-0000-000000000001', 'Discovery',   'Proposal',    480000, 480000, now() - interval '40 days'),
  ('op000001-0000-0000-0000-000000000001', 'Proposal',    'Negotiation', 480000, 480000, now() - interval '15 days'),
  ('op000001-0000-0000-0000-000000000002', null,          'Discovery',   null,   200000, now() - interval '45 days'),
  ('op000001-0000-0000-0000-000000000002', 'Discovery',   'Proposal',    200000, 220000, now() - interval '22 days'),
  ('op000001-0000-0000-0000-000000000004', null,          'Discovery',   null,   120000, now() - interval '50 days'),
  ('op000001-0000-0000-0000-000000000004', 'Discovery',   'Proposal',    120000, 140000, now() - interval '30 days'),
  ('op000001-0000-0000-0000-000000000005', null,          'Discovery',   null,   280000, now() - interval '90 days'),
  ('op000001-0000-0000-0000-000000000005', 'Discovery',   'Proposal',    280000, 310000, now() - interval '75 days'),
  ('op000001-0000-0000-0000-000000000005', 'Proposal',    'Negotiation', 310000, 320000, now() - interval '70 days'),
  ('op000001-0000-0000-0000-000000000005', 'Negotiation', 'Won',         320000, 320000, now() - interval '60 days'),
  ('op000001-0000-0000-0000-000000000007', null,          'Discovery',   null,   580000, now() - interval '120 days'),
  ('op000001-0000-0000-0000-000000000007', 'Discovery',   'Proposal',    580000, 610000, now() - interval '95 days'),
  ('op000001-0000-0000-0000-000000000007', 'Proposal',    'Negotiation', 610000, 620000, now() - interval '75 days'),
  ('op000001-0000-0000-0000-000000000007', 'Negotiation', 'Won',         620000, 620000, now() - interval '30 days'),
  ('op000001-0000-0000-0000-000000000008', null,          'Discovery',   null,   250000, now() - interval '60 days'),
  ('op000001-0000-0000-0000-000000000008', 'Discovery',   'Proposal',    250000, 280000, now() - interval '35 days'),
  ('op000001-0000-0000-0000-000000000008', 'Proposal',    'Negotiation', 280000, 280000, now() - interval '12 days'),
  ('op000001-0000-0000-0000-000000000011', null,          'Discovery',   null,   500000, now() - interval '80 days'),
  ('op000001-0000-0000-0000-000000000011', 'Discovery',   'Proposal',    500000, 500000, now() - interval '60 days'),
  ('op000001-0000-0000-0000-000000000011', 'Proposal',    'Negotiation', 500000, 500000, now() - interval '30 days'),
  ('op000001-0000-0000-0000-000000000011', 'Negotiation', 'Lost',        500000, 500000, now() - interval '15 days');

-- ── Interactions ─────────────────────────────────────────────
insert into interactions (organization_id, type, occurred_at, account_id, contact_id, opportunity_id, subject, notes, next_steps) values
  -- Hilton journey
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '55 days','ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','op000001-0000-0000-0000-000000000001','Hilton initial discovery call',           'Discussed kiosk needs across 3 properties. Strong fit. James very engaged.','Send capability deck'),
  ('00000000-0000-0000-0000-000000000001','Email',    now()-interval '50 days','ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','op000001-0000-0000-0000-000000000001','Capability deck sent to James',           'Deck sent. Awaiting feedback by end of week.','Follow up in 5 days'),
  ('00000000-0000-0000-0000-000000000001','Call',     now()-interval '42 days','ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','op000001-0000-0000-0000-000000000001','Hilton deck feedback call',               'James liked the deck. Requested ROI breakdown for 50-kiosk scenario.','Prepare ROI model'),
  ('00000000-0000-0000-0000-000000000001','Email',    now()-interval '38 days','ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','op000001-0000-0000-0000-000000000001','ROI model sent to Hilton',                'ROI model shows 14-month payback at 50 kiosks. James forwarded to Rachel.','Schedule demo'),
  ('00000000-0000-0000-0000-000000000001','Demo',     now()-interval '15 days','ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','op000001-0000-0000-0000-000000000001','Hilton kiosk demo at McLean HQ',          'Very positive reaction. Rachel joined. Want pilot in 2 properties.','Draft MSA'),
  ('00000000-0000-0000-0000-000000000001','Call',     now()-interval '5 days', 'ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000002','op000001-0000-0000-0000-000000000001','MSA review call with Rachel (Procurement)','Rachel has 2 redlines on SLA and data ownership. Legal reviewing now.','Finalize MSA'),
  -- Marriott journey
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '45 days','ac000001-0000-0000-0000-000000000002','co000001-0000-0000-0000-000000000003','op000001-0000-0000-0000-000000000002','Marriott intro meeting — Chicago',        'Michael interested. Wants to see MBS case study.','Send MBS case study'),
  ('00000000-0000-0000-0000-000000000001','Email',    now()-interval '35 days','ac000001-0000-0000-0000-000000000002','co000001-0000-0000-0000-000000000003','op000001-0000-0000-0000-000000000002','MBS case study shared with Marriott',     'Case study sent. Good initial feedback from Michael.','Schedule demo'),
  ('00000000-0000-0000-0000-000000000001','Demo',     now()-interval '22 days','ac000001-0000-0000-0000-000000000002','co000001-0000-0000-0000-000000000003','op000001-0000-0000-0000-000000000002','Marriott product demo',                   'Angela Park joined. Both positive. Raised menu customization question.','Send revised proposal'),
  ('00000000-0000-0000-0000-000000000001','Call',     now()-interval '5 days', 'ac000001-0000-0000-0000-000000000002','co000001-0000-0000-0000-000000000003','op000001-0000-0000-0000-000000000002','Marriott proposal review call',           'Proposal reviewed in detail. 3 items to revise: menu API, branding, SLA.','Revise proposal and resubmit'),
  -- SFO journey
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '30 days','ac000001-0000-0000-0000-000000000003','co000001-0000-0000-0000-000000000005','op000001-0000-0000-0000-000000000003','SFO initial discovery meeting',           'David gave tour of Terminal 3. 12M passengers/year. Excellent kiosk fit.','Prepare site survey report'),
  ('00000000-0000-0000-0000-000000000001','Email',    now()-interval '20 days','ac000001-0000-0000-0000-000000000003','co000001-0000-0000-0000-000000000005','op000001-0000-0000-0000-000000000003','Site survey report sent to SFO',          'Report with 6 proposed kiosk locations sent. David reviewing with ops team.','Follow up on site walk schedule'),
  -- UMich journey
  ('00000000-0000-0000-0000-000000000001','Call',     now()-interval '40 days','ac000001-0000-0000-0000-000000000004','co000001-0000-0000-0000-000000000006','op000001-0000-0000-0000-000000000004','UMich discovery call — campus dining',    'Jennifer oversees 40 locations. Looking for grab-and-go automation.','Send proposal with ROI breakdown'),
  ('00000000-0000-0000-0000-000000000001','Email',    now()-interval '28 days','ac000001-0000-0000-0000-000000000004','co000001-0000-0000-0000-000000000006','op000001-0000-0000-0000-000000000004','UMich proposal sent',                     'Full proposal with 3-year ROI sent. Procurement committee reviews in Oct.','Prepare ROI analysis deck'),
  -- Google (Won)
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '90 days','ac000001-0000-0000-0000-000000000006','co000001-0000-0000-0000-000000000007','op000001-0000-0000-0000-000000000005','Google initial discovery call',           'Kevin exploring 2027 workplace F&B upgrade. 15 kiosk pilot proposed.','Send proposal'),
  ('00000000-0000-0000-0000-000000000001','Demo',     now()-interval '75 days','ac000001-0000-0000-0000-000000000006','co000001-0000-0000-0000-000000000007','op000001-0000-0000-0000-000000000005','Google on-site kiosk demo at MTV',        'Demo at Mountain View. Kevin and 2 ops leads attended. Very positive.','Finalize proposal'),
  ('00000000-0000-0000-0000-000000000001','Call',     now()-interval '62 days','ac000001-0000-0000-0000-000000000006','co000001-0000-0000-0000-000000000007','op000001-0000-0000-0000-000000000005','Google contract signing call',            'Contract signed! 15 kiosks across 3 campuses. Deployment starts Sep 2026.', null),
  -- Marina Bay Sands (Won)
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '120 days','ac000001-0000-0000-0000-000000000009','co000001-0000-0000-0000-000000000009','op000001-0000-0000-0000-000000000007','MBS site visit — kiosk placement survey', 'Mapped 8 kiosk locations across hotel lobby and marina mall.','Submit floor plan and proposal'),
  ('00000000-0000-0000-0000-000000000001','Demo',     now()-interval '95 days', 'ac000001-0000-0000-0000-000000000009','co000001-0000-0000-0000-000000000009','op000001-0000-0000-0000-000000000007','MBS live kiosk demo',                     'Demo successful. William and Priya both attended. Green light given.','Contract negotiation'),
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '75 days', 'ac000001-0000-0000-0000-000000000009','co000001-0000-0000-0000-000000000009','op000001-0000-0000-0000-000000000007','MBS contract negotiation meeting',        'Agreed on 8 kiosks. Price and SLA finalized. Contract signed.', null),
  -- Changi journey
  ('00000000-0000-0000-0000-000000000001','Event',    now()-interval '65 days','ac000001-0000-0000-0000-000000000010','co000001-0000-0000-0000-000000000011','op000001-0000-0000-0000-000000000008','Met Benjamin at Singapore HX Expo',       'Benjamin approached our booth. Very interested. Arranged follow-up meeting.','Schedule discovery call'),
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '50 days','ac000001-0000-0000-0000-000000000010','co000001-0000-0000-0000-000000000011','op000001-0000-0000-0000-000000000008','Changi discovery meeting at CAG HQ',      '4-kiosk Terminal 1 pilot. Budget pre-approved. Fast decision expected.','Send proposal'),
  ('00000000-0000-0000-0000-000000000001','Email',    now()-interval '35 days','ac000001-0000-0000-0000-000000000010','co000001-0000-0000-0000-000000000011','op000001-0000-0000-0000-000000000008','Changi proposal sent',                    'Full proposal with T1 layout and SLA terms sent.','Follow up in 1 week'),
  ('00000000-0000-0000-0000-000000000001','Call',     now()-interval '10 days','ac000001-0000-0000-0000-000000000010','co000001-0000-0000-0000-000000000011','op000001-0000-0000-0000-000000000008','Changi pilot scope confirmation call',    'Benjamin confirmed T1 + T2 scope. Budget approved. Contract sent to legal.','Follow up with legal in 1 week'),
  ('00000000-0000-0000-0000-000000000001','Email',    now()-interval '3 days', 'ac000001-0000-0000-0000-000000000010','co000001-0000-0000-0000-000000000011','op000001-0000-0000-0000-000000000008','Changi contract follow-up with legal',    'Checked in with Benjamin. Legal review ongoing, expected by Aug 24.', null),
  -- NUS journey
  ('00000000-0000-0000-0000-000000000001','Meeting',  now()-interval '40 days','ac000001-0000-0000-0000-000000000011','co000001-0000-0000-0000-000000000012','op000001-0000-0000-0000-000000000009','NUS campus dining discovery meeting',     'Amanda briefed on 4 faculty locations. Very interested in 24/7 operation.','Send proposal'),
  ('00000000-0000-0000-0000-000000000001','Email',    now()-interval '25 days','ac000001-0000-0000-0000-000000000011','co000001-0000-0000-0000-000000000012','op000001-0000-0000-0000-000000000009','NUS proposal submitted',                  '6-kiosk proposal sent. Amanda forwarded to procurement committee.', null),
  -- Singapore Airlines journey
  ('00000000-0000-0000-0000-000000000001','LinkedIn', now()-interval '20 days','ac000001-0000-0000-0000-000000000015','co000001-0000-0000-0000-000000000015','op000001-0000-0000-0000-000000000012','Reached out to Aaron Ng via LinkedIn',    'Aaron responded positively. Interested in Krisflyer lounge automation.','Schedule discovery call'),
  ('00000000-0000-0000-0000-000000000001','Call',     now()-interval '12 days','ac000001-0000-0000-0000-000000000015','co000001-0000-0000-0000-000000000015','op000001-0000-0000-0000-000000000012','SQ lounge discovery call',                'Premium experience is priority. Needs case study with luxury hospitality context.','Send premium lounge case study'),
  -- Lead-only interactions
  ('00000000-0000-0000-0000-000000000001','Event',    now()-interval '60 days', null, null, null,'HITEC 2026 — booth conversations', 'Collected 12 business cards at HITEC. Thomas Nguyen and Daniel Fox were standouts.', 'Log as leads and assign follow-up tasks'),
  ('00000000-0000-0000-0000-000000000001','LinkedIn', now()-interval '18 days', null, null, null,'LinkedIn outreach to Siddharth Kapoor — Oberoi Group', 'Sent InMail. Siddharth replied within 24h. Strong interest in India expansion.','Schedule discovery call');

-- ── Tasks ────────────────────────────────────────────────────
insert into tasks (organization_id, title, type, priority, status, due_date, account_id, contact_id, opportunity_id, lead_id) values
  -- Open high-priority pipeline tasks
  ('00000000-0000-0000-0000-000000000001','Send revised MSA to Hilton legal',              'Email',        'High',  'Open',     current_date + 1,  'ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000002','op000001-0000-0000-0000-000000000001', null),
  ('00000000-0000-0000-0000-000000000001','Revise Marriott proposal — menu API & branding','Send Proposal','High',  'Open',     current_date + 2,  'ac000001-0000-0000-0000-000000000002','co000001-0000-0000-0000-000000000003','op000001-0000-0000-0000-000000000002', null),
  ('00000000-0000-0000-0000-000000000001','Schedule SFO site walk with David Kim',         'Meeting',      'Normal','Open',     current_date + 5,  'ac000001-0000-0000-0000-000000000003','co000001-0000-0000-0000-000000000005','op000001-0000-0000-0000-000000000003', null),
  ('00000000-0000-0000-0000-000000000001','Send UMich ROI analysis deck to Jennifer',      'Send Proposal','High',  'Open',     current_date,      'ac000001-0000-0000-0000-000000000004','co000001-0000-0000-0000-000000000006','op000001-0000-0000-0000-000000000004', null),
  ('00000000-0000-0000-0000-000000000001','Changi — follow up with legal on contract',     'Email',        'High',  'Open',     current_date + 7,  'ac000001-0000-0000-0000-000000000010','co000001-0000-0000-0000-000000000011','op000001-0000-0000-0000-000000000008', null),
  ('00000000-0000-0000-0000-000000000001','NUS — follow up on procurement approval',       'Follow-up',    'Normal','Open',     current_date + 10, 'ac000001-0000-0000-0000-000000000011','co000001-0000-0000-0000-000000000012','op000001-0000-0000-0000-000000000009', null),
  ('00000000-0000-0000-0000-000000000001','Send SQ Airlines premium lounge case study',    'Send Proposal','Normal','Open',     current_date + 3,  'ac000001-0000-0000-0000-000000000015','co000001-0000-0000-0000-000000000015','op000001-0000-0000-0000-000000000012', null),
  ('00000000-0000-0000-0000-000000000001','Prepare Hyatt Chicago discovery deck',          'Meeting',      'Normal','Open',     current_date + 14, 'ac000001-0000-0000-0000-000000000013','co000001-0000-0000-0000-000000000013','op000001-0000-0000-0000-000000000010', null),
  -- Lead follow-up tasks (overdue / urgent)
  ('00000000-0000-0000-0000-000000000001','Call Thomas Nguyen — Radisson Blu (HITEC SQL)',  'Call',        'High',  'Open',     current_date,      null, null, null, 'le000001-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001','Send demo recording to Sophie Martin — IHG',    'Email',       'High',  'Open',     current_date - 1,  null, null, null, 'le000001-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000001','Follow up with Brian Foster — Omni Hotels',     'Follow-up',   'High',  'Open',     current_date - 2,  null, null, null, 'le000001-0000-0000-0000-000000000007'),
  ('00000000-0000-0000-0000-000000000001','Follow up with Daniel Fox — MGM Resorts',       'Call',        'High',  'Open',     current_date + 1,  null, null, null, 'le000001-0000-0000-0000-000000000020'),
  ('00000000-0000-0000-0000-000000000001','Qualify James O''Brien — Sodexo partner opp',   'Call',        'High',  'Open',     current_date + 2,  null, null, null, 'le000001-0000-0000-0000-000000000015'),
  ('00000000-0000-0000-0000-000000000001','Send NTA Summit recap to Mei Sasaki',           'Email',       'Normal','Open',     current_date + 4,  null, null, null, 'le000001-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000001','Discovery call with Priya Singh — TCS Asia',    'Call',        'Normal','Open',     current_date + 6,  null, null, null, 'le000001-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000001','Schedule discovery call — Siddharth Kapoor (Oberoi)','Meeting','Normal','Open',    current_date + 5,  null, null, null, 'le000001-0000-0000-0000-000000000018'),
  -- Completed tasks
  ('00000000-0000-0000-0000-000000000001','Hilton — confirm pilot property list',          'Call',        'High',  'Completed',current_date - 5,  'ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','op000001-0000-0000-0000-000000000001', null),
  ('00000000-0000-0000-0000-000000000001','Send capability deck to Hilton',               'Email',       'Normal','Completed',current_date - 50, 'ac000001-0000-0000-0000-000000000001','co000001-0000-0000-0000-000000000001','op000001-0000-0000-0000-000000000001', null),
  ('00000000-0000-0000-0000-000000000001','MBS — deployment kickoff meeting',             'Meeting',     'High',  'Completed',current_date - 20, 'ac000001-0000-0000-0000-000000000009','co000001-0000-0000-0000-000000000009','op000001-0000-0000-0000-000000000007', null),
  ('00000000-0000-0000-0000-000000000001','Google — contract signing prep',               'Other',       'High',  'Completed',current_date - 62, 'ac000001-0000-0000-0000-000000000006','co000001-0000-0000-0000-000000000007','op000001-0000-0000-0000-000000000005', null);

-- Mark completed tasks with timestamps
update tasks set completed_at = now() - interval '5 days'  where title = 'Hilton — confirm pilot property list';
update tasks set completed_at = now() - interval '50 days' where title = 'Send capability deck to Hilton';
update tasks set completed_at = now() - interval '20 days' where title = 'MBS — deployment kickoff meeting';
update tasks set completed_at = now() - interval '62 days' where title = 'Google — contract signing prep';

-- ── Update leads: last_contacted_at / next_action / next_action_due_date ──
update leads set
  last_contacted_at    = now() - interval '10 days',
  next_action          = 'Schedule demo',
  next_action_due_date = current_date + 1
where id = 'le000001-0000-0000-0000-000000000001';  -- Thomas Nguyen / Radisson (SQL)

update leads set
  last_contacted_at    = now() - interval '25 days',
  next_action          = 'Send Asia F&B Summit recap deck',
  next_action_due_date = current_date + 4
where id = 'le000001-0000-0000-0000-000000000002';  -- Mei Sasaki / Narita (MQL)

update leads set
  last_contacted_at    = now() - interval '15 days',
  next_action          = 'Send campus automation case study',
  next_action_due_date = current_date + 7
where id = 'le000001-0000-0000-0000-000000000003';  -- Carlos Rivera / USC (New)

update leads set
  last_contacted_at    = now() - interval '12 days',
  next_action          = 'Send demo recording',
  next_action_due_date = current_date - 1
where id = 'le000001-0000-0000-0000-000000000004';  -- Sophie Martin / IHG (SAL) — overdue

update leads set
  last_contacted_at    = now() - interval '7 days',
  next_action          = 'Schedule intro call',
  next_action_due_date = current_date + 5
where id = 'le000001-0000-0000-0000-000000000005';  -- Raj Patel / Mount Elizabeth (New)

update leads set
  last_contacted_at    = now() - interval '14 days',
  next_action          = 'Qualify budget and timeline',
  next_action_due_date = current_date + 3
where id = 'le000001-0000-0000-0000-000000000006';  -- Lisa Huang / NTU (MQL)

update leads set
  last_contacted_at    = now() - interval '8 days',
  next_action          = 'Send proposal',
  next_action_due_date = current_date - 2
where id = 'le000001-0000-0000-0000-000000000007';  -- Brian Foster / Omni (SQL) — overdue

update leads set
  last_contacted_at    = now() - interval '20 days',
  next_action          = 'Send Korean market case study',
  next_action_due_date = current_date + 10
where id = 'le000001-0000-0000-0000-000000000008';  -- Yuna Kim / Lotte (New)

update leads set
  last_contacted_at    = now() - interval '30 days',
  next_action          = 'Retry outreach — phone call',
  next_action_due_date = current_date + 2
where id = 'le000001-0000-0000-0000-000000000009';  -- Derek Walsh / UNLV (New)

update leads set
  last_contacted_at    = now() - interval '11 days',
  next_action          = 'Discovery call',
  next_action_due_date = current_date + 6
where id = 'le000001-0000-0000-0000-000000000010';  -- Priya Singh / TCS (SAL)

update leads set
  last_contacted_at    = now() - interval '18 days',
  next_action          = 'Follow up on kiosk ROI question',
  next_action_due_date = current_date + 5
where id = 'le000001-0000-0000-0000-000000000011';  -- Marcus Johnson / AmFoodCo (MQL)

update leads set
  last_contacted_at    = now() - interval '10 days',
  next_action          = 'Send hospital F&B automation case study',
  next_action_due_date = current_date + 7
where id = 'le000001-0000-0000-0000-000000000012';  -- Aiyana Holt / Stanford Health (New)

update leads set
  last_contacted_at    = now() - interval '12 days',
  next_action          = 'Japan discovery call',
  next_action_due_date = current_date + 8
where id = 'le000001-0000-0000-0000-000000000013';  -- Hiroshi Tanaka / Tokyu (MQL)

update leads set
  last_contacted_at    = now() - interval '21 days',
  next_action          = 'Research Qatar lounge requirements',
  next_action_due_date = current_date + 14
where id = 'le000001-0000-0000-0000-000000000014';  -- Fatima Al-Hassan / Qatar (New)

update leads set
  last_contacted_at    = now() - interval '15 days',
  next_action          = 'Escalation call with manager',
  next_action_due_date = current_date + 2
where id = 'le000001-0000-0000-0000-000000000015';  -- James O''Brien / Sodexo (SAL)

update leads set
  last_contacted_at    = now() - interval '28 days',
  next_action          = 'WeChat follow-up message',
  next_action_due_date = current_date + 7
where id = 'le000001-0000-0000-0000-000000000016';  -- Wei Chen / Beijing Airport (New)

update leads set
  last_contacted_at    = now() - interval '22 days',
  next_action          = 'Warm outreach — entertainment venue angle',
  next_action_due_date = current_date + 10
where id = 'le000001-0000-0000-0000-000000000017';  -- Patricia Moore / Caesars (New)

update leads set
  last_contacted_at    = now() - interval '10 days',
  next_action          = 'Schedule discovery call',
  next_action_due_date = current_date + 5
where id = 'le000001-0000-0000-0000-000000000018';  -- Siddharth Kapoor / Oberoi (MQL)

update leads set
  last_contacted_at    = now() - interval '20 days',
  next_action          = 'Low priority — nurture email in 2 weeks',
  next_action_due_date = current_date + 14
where id = 'le000001-0000-0000-0000-000000000019';  -- Ashley Turner / Hyve (New)

update leads set
  last_contacted_at    = now() - interval '4 days',
  next_action          = 'Demo call — confirm Tuesday slot',
  next_action_due_date = current_date + 1
where id = 'le000001-0000-0000-0000-000000000020';  -- Daniel Fox / MGM (SQL)
