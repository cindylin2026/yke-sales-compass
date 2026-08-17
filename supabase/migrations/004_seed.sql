-- ============================================================
-- YKE Sales Compass — Seed Data
-- Migration 004: Demo data with valid UUIDs
-- UUID key:
--   org:  00000000-0000-0000-0000-000000000001
--   camp: 00000000-0000-0000-cafe-000000000001..008  (cafe = valid hex)
--   acc:  00000000-0000-0000-acc0-000000000001..015  (acc0 = valid)
--   con:  00000000-0000-0000-c0de-000000000001..015  (c0de = valid)
--   lead: 00000000-0000-0000-1ead-000000000001..020  (1ead = valid)
--   opp:  00000000-0000-0000-0bb0-000000000001..012  (0bb0 = valid)
-- ============================================================

insert into organizations (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Yo-Kai Express')
  on conflict (id) do nothing;

-- ── Campaigns ────────────────────────────────────────────────
insert into campaigns (id, organization_id, name, channel, region, start_date, end_date, budget, is_active) values
  ('00000000-0000-0000-cafe-000000000001','00000000-0000-0000-0000-000000000001','HITEC 2026 Chicago',     'Event',      'US',     '2026-06-16','2026-06-19', 28000, true),
  ('00000000-0000-0000-cafe-000000000002','00000000-0000-0000-0000-000000000001','LinkedIn Q3 US',         'Paid Social','US',     '2026-07-01', null,        15000, true),
  ('00000000-0000-0000-cafe-000000000003','00000000-0000-0000-0000-000000000001','Wix Website Inbound',    'Website',    'Global', '2026-01-01', null,        0,     true),
  ('00000000-0000-0000-cafe-000000000004','00000000-0000-0000-0000-000000000001','Asia F&B Summit 2026',   'Event',      'Asia',   '2026-09-10','2026-09-12', 22000, true),
  ('00000000-0000-0000-cafe-000000000005','00000000-0000-0000-0000-000000000001','Partner Referral US Q3', 'Partner',    'US',     '2026-07-01', null,        5000,  true),
  ('00000000-0000-0000-cafe-000000000006','00000000-0000-0000-0000-000000000001','NRA Show 2026',          'Trade Show', 'US',     '2026-05-17','2026-05-20', 35000, false),
  ('00000000-0000-0000-cafe-000000000007','00000000-0000-0000-0000-000000000001','Singapore HX Expo',      'Event',      'Asia',   '2026-04-08','2026-04-10', 18000, false),
  ('00000000-0000-0000-cafe-000000000008','00000000-0000-0000-0000-000000000001','Email Nurture US',       'Email',      'US',     '2026-06-01', null,        3000,  true);

-- ── Accounts ─────────────────────────────────────────────────
insert into accounts (id, organization_id, name, domain, segment, region, country, city, status, account_fit_score, employee_count, locations_count) values
  ('00000000-0000-0000-acc0-000000000001','00000000-0000-0000-0000-000000000001','Hilton Hotels & Resorts',              'hilton.com',         'Hotel',              'US',   'United States','McLean',        'Customer',        95, 150000, 600),
  ('00000000-0000-0000-acc0-000000000002','00000000-0000-0000-0000-000000000001','Marriott International',               'marriott.com',       'Hotel',              'US',   'United States','Bethesda',      'Active Prospect', 92, 180000, 500),
  ('00000000-0000-0000-acc0-000000000003','00000000-0000-0000-0000-000000000001','San Francisco International Airport',  'flysfo.com',         'Airport',            'US',   'United States','San Francisco', 'Active Prospect', 88, 2000,   1),
  ('00000000-0000-0000-acc0-000000000004','00000000-0000-0000-0000-000000000001','University of Michigan',               'umich.edu',          'University',         'US',   'United States','Ann Arbor',     'Active Prospect', 85, 48000,  40),
  ('00000000-0000-0000-acc0-000000000005','00000000-0000-0000-0000-000000000001','Cedars-Sinai Medical Center',          'cedars-sinai.org',   'Hospital',           'US',   'United States','Los Angeles',   'Target',          80, 14000,  3),
  ('00000000-0000-0000-acc0-000000000006','00000000-0000-0000-0000-000000000001','Google LLC',                           'google.com',         'Office / Corporate', 'US',   'United States','Mountain View', 'Customer',        90, 180000, 50),
  ('00000000-0000-0000-acc0-000000000007','00000000-0000-0000-0000-000000000001','7-Eleven Inc.',                        '7-eleven.com',       'Convenience Retail', 'US',   'United States','Irving',        'Active Prospect', 75, 8000,   13000),
  ('00000000-0000-0000-acc0-000000000008','00000000-0000-0000-0000-000000000001','Aramark Corporation',                  'aramark.com',        'Distributor',        'US',   'United States','Philadelphia',  'Target',          70, 280000, 500),
  ('00000000-0000-0000-acc0-000000000009','00000000-0000-0000-0000-000000000001','Marina Bay Sands',                     'marinabaysands.com', 'Hotel',              'Asia', 'Singapore',    'Singapore',     'Customer',        94, 10000,  1),
  ('00000000-0000-0000-acc0-000000000010','00000000-0000-0000-0000-000000000001','Changi Airport Group',                 'changiairport.com',  'Airport',            'Asia', 'Singapore',    'Singapore',     'Active Prospect', 91, 5000,   1),
  ('00000000-0000-0000-acc0-000000000011','00000000-0000-0000-0000-000000000001','National University of Singapore',     'nus.edu.sg',         'University',         'Asia', 'Singapore',    'Singapore',     'Active Prospect', 83, 14000,  4),
  ('00000000-0000-0000-acc0-000000000012','00000000-0000-0000-0000-000000000001','Sands Expo & Convention Centre',       'sandscasino.com',    'Entertainment',      'Asia', 'Singapore',    'Singapore',     'Target',          78, 6000,   1),
  ('00000000-0000-0000-acc0-000000000013','00000000-0000-0000-0000-000000000001','Hyatt Corporation',                    'hyatt.com',          'Hotel',              'US',   'United States','Chicago',       'Target',          87, 100000, 300),
  ('00000000-0000-0000-acc0-000000000014','00000000-0000-0000-0000-000000000001','Compass Group',                        'compass-group.com',  'Distributor',        'US',   'United States','Charlotte',     'Target',          72, 600000, 2000),
  ('00000000-0000-0000-acc0-000000000015','00000000-0000-0000-0000-000000000001','Singapore Airlines',                   'singaporeair.com',   'Airport',            'Asia', 'Singapore',    'Singapore',     'Target',          82, 27000,  5);

-- ── Contacts ─────────────────────────────────────────────────
insert into contacts (id, organization_id, account_id, first_name, last_name, title, email, phone, is_primary) values
  ('00000000-0000-0000-c0de-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000001','James','Whitfield','VP F&B Operations','james.whitfield@hilton.com','+1-703-555-0101',true),
  ('00000000-0000-0000-c0de-000000000002','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000001','Rachel','Torres','Director of Procurement','r.torres@hilton.com','+1-703-555-0102',false),
  ('00000000-0000-0000-c0de-000000000003','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000002','Michael','Chen','Head of Restaurant Operations','m.chen@marriott.com','+1-301-555-0201',true),
  ('00000000-0000-0000-c0de-000000000004','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000002','Angela','Park','F&B Innovation Manager','a.park@marriott.com','+1-301-555-0202',false),
  ('00000000-0000-0000-c0de-000000000005','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000003','David','Kim','Director of Concessions','d.kim@flysfo.com','+1-650-555-0301',true),
  ('00000000-0000-0000-c0de-000000000006','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000004','Jennifer','Liu','Director of Dining Services','j.liu@umich.edu','+1-734-555-0401',true),
  ('00000000-0000-0000-c0de-000000000007','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000006','Kevin','Zhang','Workplace Services Lead','k.zhang@google.com','+1-650-555-0601',true),
  ('00000000-0000-0000-c0de-000000000008','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000007','Sandra','Lee','VP Foodservice Innovation','s.lee@7-eleven.com','+1-972-555-0701',true),
  ('00000000-0000-0000-c0de-000000000009','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000009','William','Tan','F&B Operations Director','w.tan@marinabaysands.com','+65-6555-0901',true),
  ('00000000-0000-0000-c0de-000000000010','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000009','Priya','Nair','Head of Concierge Services','p.nair@marinabaysands.com','+65-6555-0902',false),
  ('00000000-0000-0000-c0de-000000000011','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000010','Benjamin','Lim','VP Commercial','b.lim@changiairport.com','+65-6555-1001',true),
  ('00000000-0000-0000-c0de-000000000012','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000011','Amanda','Yeo','Campus Dining Director','a.yeo@nus.edu.sg','+65-6555-1101',true),
  ('00000000-0000-0000-c0de-000000000013','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000013','Robert','Hayes','VP Food & Beverage','r.hayes@hyatt.com','+1-312-555-1301',true),
  ('00000000-0000-0000-c0de-000000000014','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000014','Christine','Wong','SVP Strategy','c.wong@compass-group.com','+1-704-555-1401',true),
  ('00000000-0000-0000-c0de-000000000015','00000000-0000-0000-0000-000000000001','00000000-0000-0000-acc0-000000000015','Aaron','Ng','Lounge Operations Manager','a.ng@singaporeair.com','+65-6555-1501',true);

-- ── Leads ────────────────────────────────────────────────────
insert into leads (id, organization_id, first_name, last_name, email, phone, title, company_name, company_domain, region, source, source_detail, campaign_id, lifecycle_stage, lead_score, notes) values
  ('00000000-0000-0000-1ead-000000000001','00000000-0000-0000-0000-000000000001','Thomas','Nguyen','t.nguyen@radissonblu.com','+1-312-555-2001','Director of Operations','Radisson Blu Chicago','radissonblu.com','US','Event Registration','HITEC 2026','00000000-0000-0000-cafe-000000000001','SQL',88,'Met at HITEC — running 3 hotels, keen on automation. Demo scheduled.'),
  ('00000000-0000-0000-1ead-000000000002','00000000-0000-0000-0000-000000000001','Mei','Sasaki','mei.sasaki@narita-airport.jp','+81-476-555-2002','F&B Concessions Manager','Narita International Airport','narita-airport.jp','Asia','Event Registration','Asia F&B Summit','00000000-0000-0000-cafe-000000000004','MQL',75,'Interested in kiosk deployment across 4 terminals.'),
  ('00000000-0000-0000-1ead-000000000003','00000000-0000-0000-0000-000000000001','Carlos','Rivera','c.rivera@usc.edu','+1-213-555-2003','VP Student Services','University of Southern California','usc.edu','US','Wix Website Inquiry','Homepage contact form','00000000-0000-0000-cafe-000000000003','New',62,'Looking for automated dining solutions for 3 campus locations.'),
  ('00000000-0000-0000-1ead-000000000004','00000000-0000-0000-0000-000000000001','Sophie','Martin','s.martin@ihg.com','+44-20-555-2004','Group F&B Director','IHG Hotels & Resorts','ihg.com','US','LinkedIn','LinkedIn InMail outreach','00000000-0000-0000-cafe-000000000002','SAL',81,'Responded to LinkedIn. Has budget for pilot in Q4. Needs ROI data.'),
  ('00000000-0000-0000-1ead-000000000005','00000000-0000-0000-0000-000000000001','Raj','Patel','r.patel@mountelizabeth.com.sg','+65-6555-2005','Head of Patient Services','Mount Elizabeth Hospital','mountelizabeth.com.sg','Asia','Referral','Referred by MBS team','00000000-0000-0000-cafe-000000000005','New',70,'Warm referral from Marina Bay Sands. Initial interest in pilot.'),
  ('00000000-0000-0000-1ead-000000000006','00000000-0000-0000-0000-000000000001','Lisa','Huang','l.huang@ntu.edu.sg','+65-6555-2006','Facilities Director','Nanyang Technological University','ntu.edu.sg','Asia','Event Registration','Asia F&B Summit','00000000-0000-0000-cafe-000000000004','MQL',73,'NTU has 30K students. Very interested in high-volume automation.'),
  ('00000000-0000-0000-1ead-000000000007','00000000-0000-0000-0000-000000000001','Brian','Foster','b.foster@omnihotels.com','+1-214-555-2007','Regional VP Operations','Omni Hotels & Resorts','omnihotels.com','US','Trade Show','NRA Show 2026','00000000-0000-0000-cafe-000000000006','SQL',85,'Strong fit. Visited booth twice at NRA. Wants proposal by Aug 30.'),
  ('00000000-0000-0000-1ead-000000000008','00000000-0000-0000-0000-000000000001','Yuna','Kim','yuna.kim@lottehotel.com','+82-2-555-2008','F&B Innovation Lead','Lotte Hotel Seoul','lottehotel.com','Asia','LinkedIn','LinkedIn connection','00000000-0000-0000-cafe-000000000002','New',65,'Korean market opportunity. Initial outreach.'),
  ('00000000-0000-0000-1ead-000000000009','00000000-0000-0000-0000-000000000001','Derek','Walsh','d.walsh@unlv.edu','+1-702-555-2009','Campus Dining Director','UNLV','unlv.edu','US','Outbound','Cold outreach sequence',null,'New',55,'Potential for campus kiosk program. No response yet.'),
  ('00000000-0000-0000-1ead-000000000010','00000000-0000-0000-0000-000000000001','Priya','Singh','p.singh@tataconsultancy.in','+91-22-555-2010','Head of Workplace Experience','Tata Consultancy Services','tcs.com','Asia','Partner','Sodexo partner referral','00000000-0000-0000-cafe-000000000005','SAL',79,'Partner intro via Sodexo. 50+ office locations in Asia.'),
  ('00000000-0000-0000-1ead-000000000011','00000000-0000-0000-0000-000000000001','Marcus','Johnson','m.johnson@amfoodco.com','+1-404-555-2011','Director of Vending','American Food Co','amfoodco.com','US','Wix Website Inquiry','Website inquiry form','00000000-0000-0000-cafe-000000000003','MQL',68,'Vending operator interested in smart kiosk expansion.'),
  ('00000000-0000-0000-1ead-000000000012','00000000-0000-0000-0000-000000000001','Aiyana','Holt','a.holt@stanfordhealth.org','+1-650-555-2012','Patient Experience Manager','Stanford Health Care','stanfordhealth.org','US','Referral','Cedars-Sinai intro','00000000-0000-0000-cafe-000000000005','New',72,'Hospital segment — warm referral. High-traffic cafeteria.'),
  ('00000000-0000-0000-1ead-000000000013','00000000-0000-0000-0000-000000000001','Hiroshi','Tanaka','h.tanaka@tokyu-hotels.co.jp','+81-3-555-2013','VP F&B','Tokyu Hotels','tokyu-hotels.co.jp','Asia','Event Registration','Asia F&B Summit','00000000-0000-0000-cafe-000000000004','MQL',76,'Japan market. Multiple urban hotel properties.'),
  ('00000000-0000-0000-1ead-000000000014','00000000-0000-0000-0000-000000000001','Fatima','Al-Hassan','f.alhassan@qatarairways.com','+974-555-2014','Lounge Operations Director','Qatar Airways','qatarairways.com','Asia','Outbound','Senior AE outreach',null,'New',60,'Premium lounge automation opportunity. Long sales cycle expected.'),
  ('00000000-0000-0000-1ead-000000000015','00000000-0000-0000-0000-000000000001','James','O''Brien','j.obrien@sodexo.com','+1-301-555-2015','SVP Growth','Sodexo North America','sodexo.com','US','Event Registration','HITEC 2026','00000000-0000-0000-cafe-000000000001','SAL',84,'Sodexo is a major potential distributor partner. Escalate to manager.'),
  ('00000000-0000-0000-1ead-000000000016','00000000-0000-0000-0000-000000000001','Wei','Chen','w.chen@pekingairport.com','+86-10-555-2016','Concessions Director','Beijing Capital Airport','pekingairport.com','Asia','Social Media','WeChat outreach',null,'New',58,'Interested via WeChat. Early stage. China market exploration.'),
  ('00000000-0000-0000-1ead-000000000017','00000000-0000-0000-0000-000000000001','Patricia','Moore','p.moore@caesars.com','+1-702-555-2017','VP Entertainment Dining','Caesars Entertainment','caesars.com','US','Outbound','Outbound sequence',null,'New',63,'High-volume entertainment venue. Strong fit if they bite.'),
  ('00000000-0000-0000-1ead-000000000018','00000000-0000-0000-0000-000000000001','Siddharth','Kapoor','s.kapoor@oberoihotels.com','+91-11-555-2018','Group Operations Director','The Oberoi Group','oberoihotels.com','Asia','LinkedIn','LinkedIn InMail','00000000-0000-0000-cafe-000000000002','MQL',77,'Luxury hotel group in India. 30+ properties. Strong interest.'),
  ('00000000-0000-0000-1ead-000000000019','00000000-0000-0000-0000-000000000001','Ashley','Turner','a.turner@hyve.com','+1-617-555-2019','Operations Analyst','Hyve Group','hyve.com','US','Wix Website Inquiry','Website inquiry','00000000-0000-0000-cafe-000000000003','New',51,'Low score, just exploring. Follow up in 2 weeks.'),
  ('00000000-0000-0000-1ead-000000000020','00000000-0000-0000-0000-000000000001','Daniel','Fox','d.fox@mgmresorts.com','+1-702-555-2020','SVP Food & Beverage','MGM Resorts International','mgmresorts.com','US','Event Registration','HITEC 2026','00000000-0000-0000-cafe-000000000001','SQL',91,'Top lead from HITEC. MGM has 30+ properties. Demo next Tuesday.');
