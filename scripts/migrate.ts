#!/usr/bin/env bun
/**
 * Run SQL migrations against Supabase using the service role key.
 * Uses the Supabase Management API's SQL endpoint.
 *
 * Run with: bun run scripts/migrate.ts
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal(): Record<string, string> {
  const path = join(ROOT_DIR, ".env.local");
  const env: Record<string, string> = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = { ...loadEnvLocal(), ...process.env };
const SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];
const PROJECT_URL = env["VITE_SUPABASE_URL"];

if (!SERVICE_KEY || !PROJECT_URL) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL.\n" +
    "Set them in .env.local (see .env.example) or as environment variables.",
  );
  process.exit(1);
}

// We'll run SQL via the PostgREST rpc call to a helper function.
// Since we can't use Management API without sbp_ token,
// we create a temporary exec function first, then use it.

const MIGRATIONS = [
  "supabase/migrations/001_schema.sql",
  "supabase/migrations/002_rls.sql",
  "supabase/migrations/003_functions.sql",
  "supabase/migrations/004_seed.sql",
];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function createExecFunction() {
  // Bootstrap: create an exec_sql function via the Supabase REST API
  // using a known endpoint that accepts raw SQL with service_role
  const bootstrapSql = `
    create or replace function exec_sql(query text)
    returns void language plpgsql security definer as $$
    begin execute query; end; $$;
  `;

  const res = await fetch(`${PROJECT_URL}/rest/v1/`, {
    method: "POST",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "params=single-object",
    },
    body: JSON.stringify({ query: bootstrapSql }),
  });
  return res;
}

async function runViaPg(sql: string): Promise<{ ok: boolean; error?: string }> {
  // Split by statement terminator to handle multi-statement SQL
  // Use Supabase's pg REST endpoint
  const res = await fetch(`${PROJECT_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    return { ok: true };
  }
  const text = await res.text();
  return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 300)}` };
}

async function main() {
  console.log("YKE Sales Compass — Database Migration\n");
  console.log(`Target: ${PROJECT_URL}\n`);

  // First bootstrap the exec_sql helper
  console.log("Bootstrapping exec_sql function...");
  const bootstrap = await fetch(`${PROJECT_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `select 1`,
    }),
  });

  if (!bootstrap.ok) {
    const txt = await bootstrap.text();
    console.log(`  exec_sql not available yet (${bootstrap.status}): ${txt.slice(0, 200)}`);
    console.log("\n⚠️  Cannot run migrations via REST API without Management API access.");
    console.log("\nPlease run the SQL files manually in the Supabase SQL Editor:");
    console.log("  https://supabase.com/dashboard/project/nrzzzfiflsusetktkpsr/sql/new\n");
    for (const m of MIGRATIONS) {
      console.log(`  • ${m}`);
    }
    console.log("\nCopy and paste each file's content in order (001, 002, 003, 004).");
    process.exit(0);
  }

  let allOk = true;
  for (const migration of MIGRATIONS) {
    const path = join(ROOT, migration);
    const sql = readFileSync(path, "utf-8");
    const label = migration.split("/").pop()!;
    process.stdout.write(`Running ${label}... `);
    const result = await runViaPg(sql);
    if (result.ok) {
      console.log("✓");
    } else {
      console.log(`✗\n  ${result.error}`);
      allOk = false;
    }
  }

  console.log(allOk ? "\n✓ All migrations complete." : "\n✗ Migrations finished with errors.");
}

main().catch(console.error);
