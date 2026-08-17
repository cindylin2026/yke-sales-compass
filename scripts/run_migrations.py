#!/usr/bin/env python3
"""
Run Supabase migrations via the Management API.
Usage: python3 scripts/run_migrations.py
"""
import json
import urllib.request
import urllib.error
import sys
import os

SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yenp6ZmlmbHN1c2V0a3RrcHNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk5NDAwMywiZXhwIjoyMTAyNTcwMDAzfQ.2ZKGt_TYDkGrh-76W9P5JLc1YLTx7Sy2Bcf8CPWnvAc"
PROJECT_REF = "nrzzzfiflsusetktkpsr"

MIGRATIONS = [
    "supabase/migrations/001_schema.sql",
    "supabase/migrations/002_rls.sql",
    "supabase/migrations/003_functions.sql",
    "supabase/migrations/004_seed.sql",
]

def run_sql(sql: str, label: str) -> bool:
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    payload = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            print(f"  ✓ {label}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"  ✗ {label} — HTTP {e.code}: {body[:400]}")
        return False
    except Exception as e:
        print(f"  ✗ {label} — {e}")
        return False


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ok = True
    for migration in MIGRATIONS:
        path = os.path.join(base, migration)
        if not os.path.exists(path):
            print(f"  ✗ File not found: {path}")
            ok = False
            continue
        sql = open(path, encoding="utf-8").read()
        label = os.path.basename(path)
        print(f"\nRunning {label}...")
        if not run_sql(sql, label):
            ok = False
    print("\nDone." if ok else "\nCompleted with errors — check output above.")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
