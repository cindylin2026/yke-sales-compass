#!/usr/bin/env python3
"""
YKE CSV → Supabase SQL import
Converts the 5 AppSheet CSV exports into a single SQL file safe to run
in Supabase SQL Editor.

Run:
    python3 scripts/csv_to_sql.py

Output:
    supabase/migrations/006_import_csv_data.sql
"""

import csv
import os
import re
import uuid
from datetime import datetime

BASE = os.path.join(os.path.expanduser("~"), "Downloads",
                    "YKE Location & Partner Evaluation Framework - ")
OUT  = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "supabase", "migrations", "006_import_csv_data.sql")

ORG_ID = "00000000-0000-0000-0000-000000000001"

# ── helpers ──────────────────────────────────────────────────────────────────

def sq(v):
    """Escape a string value for SQL single-quote literals."""
    if v is None or str(v).strip() == "":
        return "null"
    return "'" + str(v).replace("'", "''").strip() + "'"

def sqf(v):
    """Numeric or null."""
    s = str(v).strip() if v else ""
    s = re.sub(r"[,$%]", "", s)
    try:
        return str(float(s)) if s else "null"
    except ValueError:
        return "null"

def sqi(v):
    """Integer or null."""
    s = str(v).strip() if v else ""
    s = re.sub(r"[,$ ]", "", s)
    try:
        return str(int(float(s))) if s else "null"
    except ValueError:
        return "null"

def sqdate(v):
    """Date string → SQL date or null."""
    if not v or str(v).strip() == "":
        return "null"
    s = str(v).strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%m/%d/%y", "%B %d, %Y"):
        try:
            return "'" + datetime.strptime(s, fmt).strftime("%Y-%m-%d") + "'"
        except ValueError:
            pass
    return "null"

def clean_segment(vertical):
    mapping = {
        "hospitality": "Hotel",
        "hotel": "Hotel",
        "airport": "Airport",
        "university": "University",
        "college": "University",
        "hospital": "Hospital",
        "healthcare": "Hospital",
        "medical": "Hospital",
        "corporate": "Office / Corporate",
        "office": "Office / Corporate",
        "convenience": "Convenience Retail",
        "retail": "Convenience Retail",
        "distributor": "Distributor",
        "entertainment": "Entertainment",
        "casino": "Entertainment",
        "arena": "Entertainment",
    }
    v = str(vertical).lower().strip() if vertical else ""
    for k, seg in mapping.items():
        if k in v:
            return seg
    return "Office / Corporate"

def clean_region(city_or_country):
    """Infer US vs Asia from country or city."""
    asia_keywords = [
        "singapore", "china", "japan", "korea", "taiwan", "hong kong",
        "malaysia", "thailand", "vietnam", "indonesia", "india", "sg",
        "cn", "jp", "kr", "tw", "hk", "my", "th", "vn", "id", "in",
    ]
    s = str(city_or_country).lower() if city_or_country else ""
    return "Asia" if any(k in s for k in asia_keywords) else "US"

def clean_status(stage):
    mapping = {
        "target": "Target",
        "prospect": "Active Prospect",
        "active prospect": "Active Prospect",
        "customer": "Customer",
        "on hold": "On Hold",
        "churned": "Churned",
    }
    s = str(stage).lower().strip() if stage else ""
    for k, v in mapping.items():
        if k in s:
            return v
    return "Target"

def clean_source(src):
    valid = [
        "Wix Website Inquiry", "Event Registration", "Trade Show", "LinkedIn",
        "Social Media", "Referral", "Partner", "Outbound", "Manual Entry", "Other Campaign",
    ]
    s = str(src).strip() if src else ""
    s_low = s.lower()
    if "wix" in s_low or "website" in s_low:
        return "Wix Website Inquiry"
    if "event" in s_low or "conference" in s_low:
        return "Event Registration"
    if "trade show" in s_low or "tradeshow" in s_low:
        return "Trade Show"
    if "linkedin" in s_low:
        return "LinkedIn"
    if "social" in s_low:
        return "Social Media"
    if "referral" in s_low:
        return "Referral"
    if "partner" in s_low:
        return "Partner"
    if "outbound" in s_low or "cold" in s_low:
        return "Outbound"
    for v in valid:
        if v.lower() == s_low:
            return v
    return "Manual Entry"

def clean_interaction_type(t):
    valid = ["Email", "Call", "Meeting", "Demo", "LinkedIn", "Event", "Other"]
    s = str(t).strip() if t else ""
    for v in valid:
        if v.lower() == s.lower():
            return v
    if "call" in s.lower():
        return "Call"
    if "meet" in s.lower() or "visit" in s.lower():
        return "Meeting"
    if "email" in s.lower():
        return "Email"
    if "demo" in s.lower():
        return "Demo"
    if "linkedin" in s.lower():
        return "LinkedIn"
    if "event" in s.lower():
        return "Event"
    return "Other"

def read_csv(name):
    path = BASE + name + ".csv"
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

# ── load CSVs ─────────────────────────────────────────────────────────────────

print("Reading CSVs...")
accounts_raw     = read_csv("Master Database")
contacts_raw     = read_csv("Contacts")
interactions_raw = read_csv("Interaction Logs")

print(f"  Accounts:     {len(accounts_raw)}")
print(f"  Contacts:     {len(contacts_raw)}")
print(f"  Interactions: {len(interactions_raw)}")

# ── build UUID maps ───────────────────────────────────────────────────────────

# account_name → uuid
account_uuid: dict[str, str] = {}
for row in accounts_raw:
    name = str(row.get("Account Name", "")).strip()
    if name:
        account_uuid[name] = str(uuid.uuid4())

# contact csv_id → uuid  (Contact ID is "1", "2" etc.)
contact_uuid: dict[str, str] = {}
for row in contacts_raw:
    cid = str(row.get("Contact ID", "")).strip()
    if cid:
        contact_uuid[cid] = str(uuid.uuid4())

print(f"\nUnique accounts: {len(account_uuid)}")
print(f"Unique contacts: {len(contact_uuid)}")

# ── generate SQL ──────────────────────────────────────────────────────────────

lines = []

def w(*args):
    lines.append(" ".join(str(a) for a in args))

w("-- ============================================================")
w("-- YKE Sales Compass — Real CSV Data Import")
w("-- Migration 006: Converted from AppSheet CSV exports")
w(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
w("-- Run AFTER 001-005 migrations")
w("-- ============================================================")
w()
w("-- Clear any existing data (006 replaces 005 real data)")
w("delete from audit_logs;")
w("delete from opportunity_stage_history;")
w("delete from lead_stage_history;")
w("delete from tasks;")
w("delete from interactions;")
w("delete from opportunities;")
w("delete from contacts;")
w("delete from leads;")
w("delete from accounts;")
w("delete from campaigns;")
w()

# ── ACCOUNTS ──────────────────────────────────────────────────────────────────
w("-- ── Accounts (" + str(len(account_uuid)) + " rows) ──────────────────────────────────────────")
w("insert into accounts")
w("  (id, organization_id, name, domain, website, segment, region, country, city, full_address,")
w("   status, account_fit_score, employee_count, notes, created_at, updated_at)")
w("values")

account_rows = []
for row in accounts_raw:
    name = str(row.get("Account Name", "")).strip()
    if not name:
        continue
    uid = account_uuid[name]
    website = str(row.get("Website", "")).strip()
    domain = ""
    if website:
        m = re.search(r"(?:https?://)?(?:www\.)?([^/\s]+)", website)
        domain = m.group(1) if m else ""

    country = str(row.get("Country", "")).strip()
    city    = str(row.get("Region / City", "")).strip()
    region  = clean_region(country or city)
    segment = clean_segment(row.get("Vertical", ""))
    status  = clean_status(row.get("Pipeline Stage", ""))

    score_raw = row.get("Total Score", "") or ""
    score_str = re.sub(r"[^0-9.]", "", str(score_raw))
    try:
        raw_score = float(score_str)
        # Rubric max is 30 (6 metrics × 5), normalise to 0-100
        fit_score = min(100, max(0, round(raw_score / 30 * 100))) if raw_score else 50
    except ValueError:
        fit_score = 50

    emp = sqi(row.get("# Employees", ""))
    notes_parts = []
    if row.get("Recommendation"):
        notes_parts.append(str(row["Recommendation"]).strip())
    if row.get("Foot Traffic / Demand Density"):
        notes_parts.append("Foot traffic: " + str(row["Foot Traffic / Demand Density"]).strip())
    notes = " | ".join(notes_parts) if notes_parts else ""

    created = sqdate(row.get("Date", "")) or "now()"

    account_rows.append(
        f"  ('{uid}', '{ORG_ID}', {sq(name)}, {sq(domain)}, {sq(website)}, "
        f"{sq(segment)}, {sq(region)}, {sq(country)}, {sq(city)}, "
        f"{sq(row.get('Full Address',''))}, {sq(status)}, {fit_score}, "
        f"{emp}, {sq(notes)}, {created}, {created})"
    )

w(",\n".join(account_rows) + ";")
w()

# ── CONTACTS ──────────────────────────────────────────────────────────────────
w("-- ── Contacts (" + str(len(contacts_raw)) + " rows) ──────────────────────────────────────────")
w("insert into contacts")
w("  (id, organization_id, account_id, first_name, last_name, title,")
w("   email, phone, linkedin_url, is_primary, created_at, updated_at)")
w("values")

contact_rows = []
for row in contacts_raw:
    cid = str(row.get("Contact ID", "")).strip()
    if not cid:
        continue
    uid = contact_uuid[cid]
    acc_name = str(row.get("Account Name", "")).strip()
    acc_uuid = account_uuid.get(acc_name)
    if not acc_uuid:
        # Account not in master DB — skip contact to avoid FK violation
        continue

    fn = str(row.get("First Name", "")).strip()
    ln = str(row.get("Last Name", "")).strip()
    if not fn and not ln:
        continue

    phone = (str(row.get("Mobile", "")).strip() or
             str(row.get("Company Phone", "")).strip())

    contact_rows.append(
        f"  ('{uid}', '{ORG_ID}', '{acc_uuid}', {sq(fn)}, {sq(ln)}, "
        f"{sq(row.get('Title',''))}, {sq(row.get('Email',''))}, "
        f"{sq(phone)}, {sq(row.get('Person Linkedin Url',''))}, false, now(), now())"
    )

w(",\n".join(contact_rows) + ";")
w()

# Mark one contact per account as primary
w("-- Mark first contact per account as primary")
w("""update contacts c
set is_primary = true
where c.id in (
  select distinct on (account_id) id
  from contacts
  where account_id is not null
  order by account_id, created_at
);""")
w()

# ── INTERACTIONS ──────────────────────────────────────────────────────────────
valid_interactions = [r for r in interactions_raw if r.get("Account Name", "").strip()]
w("-- ── Interactions (" + str(len(valid_interactions)) + " rows) ──────────────────────────────────")
w("insert into interactions")
w("  (organization_id, type, occurred_at, account_id, contact_id,")
w("   subject, notes, next_steps, google_doc_url, created_at, updated_at)")
w("values")

interaction_rows = []
for row in valid_interactions:
    acc_name = str(row.get("Account Name", "")).strip()
    acc_uuid = account_uuid.get(acc_name)
    if not acc_uuid:
        continue

    cid = str(row.get("Contact ID", "")).strip()
    con_uuid = contact_uuid.get(cid) if cid else None
    con_val  = f"'{con_uuid}'" if con_uuid else "null"

    itype    = clean_interaction_type(row.get("Interaction Type", ""))
    date_val = sqdate(row.get("Date", ""))
    occurred = date_val if date_val != "null" else "now()"
    occurred_ts = occurred.rstrip("'") + " 09:00:00+00'" if occurred != "now()" else "now()"

    # Build subject from type + account
    subject = f"{itype} — {acc_name}"

    # Notes: combine Notes + machine qty context
    notes_parts = []
    if row.get("Notes"):
        notes_parts.append(str(row["Notes"]).strip())
    boba = str(row.get("Boba Machine Qty", "")).strip()
    ramen = str(row.get("Ramen Machine Qty", "")).strip()
    tcv = str(row.get("YKE Opportunity Size (36-Mo TCV)", "")).strip()
    if boba:  notes_parts.append(f"Boba machines: {boba}")
    if ramen: notes_parts.append(f"Ramen machines: {ramen}")
    if tcv:   notes_parts.append(f"TCV: {tcv}")
    notes = " | ".join(notes_parts)

    next_step = str(row.get("Next Step", "")).strip()
    doc_url   = str(row.get("Gemini Doc URL", "")).strip()

    interaction_rows.append(
        f"  ('{ORG_ID}', {sq(itype)}, {occurred_ts}, '{acc_uuid}', {con_val}, "
        f"{sq(subject)}, {sq(notes)}, {sq(next_step)}, {sq(doc_url)}, now(), now())"
    )

w(",\n".join(interaction_rows) + ";")
w()

# ── Also create contacts from Master Database primary contact columns ─────────
# These are the "legacy/denormalized" contacts in the accounts sheet
w("-- ── Extra contacts from Master Database primary contact columns ──────────")
w("insert into contacts")
w("  (id, organization_id, account_id, first_name, last_name, title,")
w("   email, phone, linkedin_url, is_primary, created_at, updated_at)")
w("values")

extra_contact_rows = []
seen_emails: set[str] = set()
for row in accounts_raw:
    acc_name = str(row.get("Account Name", "")).strip()
    acc_uuid = account_uuid.get(acc_name)
    if not acc_uuid:
        continue
    fn = str(row.get("Primary Contact First Name", "")).strip()
    ln = str(row.get("Primary Contact Last Name", "")).strip()
    if not fn and not ln:
        continue
    email = str(row.get("Email", "")).strip().lower()
    # skip if already in contacts sheet by email
    if email and email in seen_emails:
        continue
    if email:
        seen_emails.add(email)
    phone = (str(row.get("Mobile", "")).strip() or
             str(row.get("Company Phone", "")).strip())
    new_uid = str(uuid.uuid4())
    extra_contact_rows.append(
        f"  ('{new_uid}', '{ORG_ID}', '{acc_uuid}', {sq(fn)}, {sq(ln)}, "
        f"{sq(row.get('Title',''))}, {sq(email)}, {sq(phone)}, "
        f"{sq(row.get('Person Linkedin Url',''))}, false, now(), now())"
    )

if extra_contact_rows:
    w(",\n".join(extra_contact_rows) + ";")
else:
    w("-- (no extra contacts to add)")
w()

# ── write file ────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"\n✓ Written to: {OUT}")
print(f"  Accounts:     {len(account_rows)}")
print(f"  Contacts:     {len(contact_rows)}")
print(f"  Interactions: {len(interaction_rows)}")
print(f"  Extra contacts from master DB: {len(extra_contact_rows)}")
print("\nNext step: paste 006_import_csv_data.sql into Supabase SQL Editor and run it.")
