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

# Deterministic UUID v5 — same input always gives same UUID
NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

def stable_uuid(key: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"yke:{key}"))

BASE = os.path.join(os.path.expanduser("~"), "Downloads",
                    "YKE Location & Partner Evaluation Framework - ")
OUT  = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "supabase", "migrations", "006_import_csv_data.sql")

ORG_ID = "00000000-0000-0000-0000-000000000001"

# ── helpers ───────────────────────────────────────────────────────────────────

def sq(v):
    if v is None or str(v).strip() == "":
        return "null"
    return "'" + str(v).replace("'", "''").strip() + "'"

def sqi(v):
    s = re.sub(r"[,$ ]", "", str(v).strip()) if v else ""
    try:
        return str(int(float(s))) if s else "null"
    except ValueError:
        return "null"

def sqdate(v):
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
        "hospitality": "Hotel", "hotel": "Hotel",
        "airport": "Airport",
        "university": "University", "college": "University",
        "hospital": "Hospital", "healthcare": "Hospital", "medical": "Hospital",
        "corporate": "Office / Corporate", "office": "Office / Corporate",
        "convenience": "Convenience Retail", "retail": "Convenience Retail",
        "distributor": "Distributor",
        "entertainment": "Entertainment", "casino": "Entertainment", "arena": "Entertainment",
    }
    v = str(vertical).lower().strip() if vertical else ""
    for k, seg in mapping.items():
        if k in v:
            return seg
    return "Office / Corporate"

def clean_region(city_or_country):
    asia_kw = ["singapore","china","japan","korea","taiwan","hong kong","malaysia",
               "thailand","vietnam","indonesia","india"," sg"," cn"," jp"," kr"," tw"]
    s = str(city_or_country).lower() if city_or_country else ""
    return "Asia" if any(k in s for k in asia_kw) else "US"

def clean_status(stage):
    s = str(stage).lower().strip() if stage else ""
    if "prospect" in s or "active" in s: return "Active Prospect"
    if "customer" in s: return "Customer"
    if "hold" in s: return "On Hold"
    if "churn" in s: return "Churned"
    return "Target"

def clean_interaction_type(t):
    s = str(t).strip().lower() if t else ""
    if "call" in s: return "Call"
    if "meet" in s or "visit" in s: return "Meeting"
    if "email" in s: return "Email"
    if "demo" in s: return "Demo"
    if "linkedin" in s: return "LinkedIn"
    if "event" in s: return "Event"
    return "Other"

def read_csv(name):
    with open(BASE + name + ".csv", encoding="utf-8-sig") as f:
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

# Build account UUID map from Master DB
account_uuid: dict[str, str] = {}
for row in accounts_raw:
    name = str(row.get("Account Name", "")).strip()
    key  = name if name else "-"
    account_uuid[key] = stable_uuid(f"account:{key}")

# Also add any account names that appear in Contacts/Interactions but NOT in Master DB
for row in contacts_raw:
    acc = str(row.get("Account Name", "")).strip()
    key = acc if acc else "-"
    if key not in account_uuid:
        account_uuid[key] = stable_uuid(f"account:{key}")

for row in interactions_raw:
    acc = str(row.get("Account Name", "")).strip()
    key = acc if acc else "-"
    if key not in account_uuid:
        account_uuid[key] = stable_uuid(f"account:{key}")

# Contact ID → UUID
contact_uuid: dict[str, str] = {}
for row in contacts_raw:
    cid = str(row.get("Contact ID", "")).strip()
    if cid:
        contact_uuid[cid] = stable_uuid(f"contact:{cid}")

print(f"\nTotal unique accounts (incl. contacts-only): {len(account_uuid)}")
print(f"Unique contacts: {len(contact_uuid)}")

# ── generate SQL ──────────────────────────────────────────────────────────────

lines = []
def w(*args):
    lines.append(" ".join(str(a) for a in args))

w("-- ============================================================")
w("-- YKE Sales Compass — Real CSV Data Import")
w("-- Migration 006: Converted from AppSheet CSV exports")
w(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
w("-- ALL rows imported; missing fields marked with '-'")
w("-- ============================================================")
w()
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
# First pass: master DB rows (full data)
account_rows = []
master_db_names: set[str] = set()

for row in accounts_raw:
    raw_name = str(row.get("Account Name", "")).strip()
    name = raw_name if raw_name else "-"
    master_db_names.add(name)
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

    score_str = re.sub(r"[^0-9.]", "", str(row.get("Total Score", "") or ""))
    try:
        fit_score = min(100, max(0, round(float(score_str) / 30 * 100))) if score_str else 50
    except ValueError:
        fit_score = 50

    emp = sqi(row.get("# Employees", ""))
    notes_parts = []
    if row.get("Recommendation"):
        notes_parts.append(str(row["Recommendation"]).strip())
    if row.get("Foot Traffic / Demand Density"):
        notes_parts.append("Foot traffic: " + str(row["Foot Traffic / Demand Density"]).strip())
    notes = " | ".join(notes_parts)

    created_raw = sqdate(row.get("Date", ""))
    created = created_raw if created_raw != "null" else "now()"

    account_rows.append(
        f"  ('{uid}', '{ORG_ID}', {sq(name)}, {sq(domain)}, {sq(website)}, "
        f"{sq(segment)}, {sq(region)}, {sq(country or '-')}, {sq(city or '-')}, "
        f"{sq(row.get('Full Address',''))}, {sq(status)}, {fit_score}, "
        f"{emp}, {sq(notes)}, {created}, {created})"
    )

# Second pass: accounts referenced in Contacts/Interactions but NOT in Master DB
extra_account_count = 0
for acc_name, uid in account_uuid.items():
    if acc_name in master_db_names:
        continue
    # These are "unknown" accounts — use '-' for required fields
    account_rows.append(
        f"  ('{uid}', '{ORG_ID}', {sq(acc_name)}, null, null, "
        f"'Office / Corporate', 'US', '-', '-', null, 'Target', 50, "
        f"null, 'Imported from contacts/interactions — account details unknown', now(), now())"
    )
    extra_account_count += 1

w(f"-- ── Accounts ({len(account_rows)} rows: {len(master_db_names)} from Master DB + {extra_account_count} from contacts/interactions)")
w("insert into accounts")
w("  (id, organization_id, name, domain, website, segment, region, country, city, full_address,")
w("   status, account_fit_score, employee_count, notes, created_at, updated_at)")
w("values")
w(",\n".join(account_rows) + "\nON CONFLICT (id) DO NOTHING;")
w()

# ── CONTACTS ──────────────────────────────────────────────────────────────────
contact_rows = []
for row in contacts_raw:
    cid = str(row.get("Contact ID", "")).strip()
    if not cid:
        continue
    uid = contact_uuid[cid]

    raw_acc = str(row.get("Account Name", "")).strip()
    acc_key = raw_acc if raw_acc else "-"
    acc_id  = account_uuid[acc_key]  # always exists now

    fn = str(row.get("First Name", "")).strip() or "-"
    ln = str(row.get("Last Name", "")).strip() or "-"

    phone = (str(row.get("Mobile", "")).strip() or
             str(row.get("Company Phone", "")).strip())

    contact_rows.append(
        f"  ('{uid}', '{ORG_ID}', '{acc_id}', {sq(fn)}, {sq(ln)}, "
        f"{sq(row.get('Title',''))}, {sq(row.get('Email',''))}, "
        f"{sq(phone)}, {sq(row.get('Person Linkedin Url',''))}, false, now(), now())"
    )

w(f"-- ── Contacts ({len(contact_rows)} rows)")
w("insert into contacts")
w("  (id, organization_id, account_id, first_name, last_name, title,")
w("   email, phone, linkedin_url, is_primary, created_at, updated_at)")
w("values")
w(",\n".join(contact_rows) + "\nON CONFLICT (id) DO NOTHING;")
w()

# Mark first contact per account as primary
w("update contacts set is_primary = true where id in (")
w("  select distinct on (account_id) id from contacts")
w("  where account_id is not null order by account_id, created_at")
w(");")
w()

# ── INTERACTIONS ──────────────────────────────────────────────────────────────
interaction_rows = []
for row in interactions_raw:
    raw_acc = str(row.get("Account Name", "")).strip()
    acc_key = raw_acc if raw_acc else "-"
    acc_id  = account_uuid[acc_key]  # always exists now

    cid      = str(row.get("Contact ID", "")).strip()
    con_val  = f"'{contact_uuid[cid]}'" if cid and cid in contact_uuid else "null"

    itype    = clean_interaction_type(row.get("Interaction Type", ""))
    date_val = sqdate(row.get("Date", ""))
    occurred = (date_val.rstrip("'") + " 09:00:00+00'" if date_val != "null" else "now()")

    subject  = f"{itype} — {acc_key}"

    notes_parts = []
    if row.get("Notes"):      notes_parts.append(str(row["Notes"]).strip())
    if row.get("Boba Machine Qty","").strip():
        notes_parts.append("Boba machines: " + row["Boba Machine Qty"].strip())
    if row.get("Ramen Machine Qty","").strip():
        notes_parts.append("Ramen machines: " + row["Ramen Machine Qty"].strip())
    if row.get("YKE Opportunity Size (36-Mo TCV)","").strip():
        notes_parts.append("TCV: " + row["YKE Opportunity Size (36-Mo TCV)"].strip())
    notes    = " | ".join(notes_parts)
    next_step = str(row.get("Next Step", "")).strip()
    doc_url   = str(row.get("Gemini Doc URL", "")).strip()

    interaction_rows.append(
        f"  ('{ORG_ID}', {sq(itype)}, {occurred}, '{acc_id}', {con_val}, "
        f"{sq(subject)}, {sq(notes)}, {sq(next_step)}, {sq(doc_url)}, now(), now())"
    )

w(f"-- ── Interactions ({len(interaction_rows)} rows)")
w("insert into interactions")
w("  (organization_id, type, occurred_at, account_id, contact_id,")
w("   subject, notes, next_steps, google_doc_url, created_at, updated_at)")
w("values")
w(",\n".join(interaction_rows) + "\nON CONFLICT DO NOTHING;")
w()

# ── Extra contacts from Master Database primary contact columns ───────────────
extra_rows = []
seen_emails: set[str] = set()
for row in accounts_raw:
    raw_name = str(row.get("Account Name", "")).strip()
    acc_key  = raw_name if raw_name else "-"
    acc_id   = account_uuid[acc_key]

    fn = str(row.get("Primary Contact First Name", "")).strip()
    ln = str(row.get("Primary Contact Last Name", "")).strip()
    if not fn and not ln:
        continue
    fn = fn or "-"
    ln = ln or "-"

    email = str(row.get("Email", "")).strip().lower()
    if email and email in seen_emails:
        continue
    if email:
        seen_emails.add(email)

    phone = (str(row.get("Mobile", "")).strip() or
             str(row.get("Company Phone", "")).strip())
    new_uid = stable_uuid(f"master-contact:{acc_key}:{fn}:{ln}:{email}")
    extra_rows.append(
        f"  ('{new_uid}', '{ORG_ID}', '{acc_id}', {sq(fn)}, {sq(ln)}, "
        f"{sq(row.get('Title',''))}, {sq(email)}, {sq(phone)}, "
        f"{sq(row.get('Person Linkedin Url',''))}, false, now(), now())"
    )

if extra_rows:
    w(f"-- ── Extra contacts from Master DB primary contact columns ({len(extra_rows)} rows)")
    w("insert into contacts")
    w("  (id, organization_id, account_id, first_name, last_name, title,")
    w("   email, phone, linkedin_url, is_primary, created_at, updated_at)")
    w("values")
    w(",\n".join(extra_rows) + "\nON CONFLICT (id) DO NOTHING;")
    w()

# ── write file ────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"\n✓ Written to: {OUT}")
print(f"  Accounts:              {len(account_rows)} ({extra_account_count} extra from contacts/interactions)")
print(f"  Contacts (sheet):      {len(contact_rows)}")
print(f"  Contacts (master DB):  {len(extra_rows)}")
print(f"  Interactions:          {len(interaction_rows)}")
print("\nNext: paste 006_import_csv_data.sql into Supabase SQL Editor and run.")
