# YKE Sales Compass

The sales CRM for Yo-Kai Express — leads, accounts, contacts, opportunities, and the follow-up tasks that tie them together. TanStack Start on Supabase, deployed on Vercel, auto-deploying from `main`.

- **Production:** https://yke-sales-compass.vercel.app
- **Repo:** https://github.com/cindylin2026/yke-sales-compass

## Stack

| Layer | What it is |
|---|---|
| Language | TypeScript |
| Frontend framework | React 19 |
| App framework | TanStack Start — file-based routing + server-side rendering |
| Build tool | Vite 8 + Nitro |
| Database + backend | Supabase (Postgres, Auth, Row-Level Security) |
| Styling | Tailwind CSS |
| UI components | Radix UI |
| Data fetching / caching | TanStack Query |
| Charts | Recharts |
| Forms | react-hook-form |
| Package manager | bun |
| Hosting | Vercel — auto-deploys on push to `main` |

## Getting access

Do these in order — later steps depend on earlier ones.

1. **GitHub** — get added as a collaborator on the repo (Settings → Collaborators and teams → Add people).

   Before your first push, set your local git email to a verified GitHub email:
   ```sh
   git config user.email "you@example.com"
   ```
   Vercel silently blocks a deploy if the commit author email doesn't match a verified GitHub address. See the incident log below.

2. **Vercel** — the `yke` team is on the Hobby plan, which caps membership at one seat. It needs to be upgraded to Pro before a second person can be invited as a team member (vercel.com/teams/yke/settings/members). Once you're in, you can pull env vars yourself with the CLI instead of copy-pasting secrets.

3. **Supabase** — get invited to the project from the Supabase dashboard (Project Settings → Team). You'll want this for running migrations and reading data directly when debugging.

4. **Local secrets** — once you have Vercel access, run `vercel link` then `vercel env pull .env.local` in the repo root. That's the whole setup — no secrets need to travel over chat or email.

## Running it locally

```sh
# after env vars are pulled (step 4 above)
git clone https://github.com/cindylin2026/yke-sales-compass.git
cd yke-sales-compass
npm install
npm run dev
# → http://localhost:8080
```

To work without touching real Supabase auth, set `VITE_AUTH_REQUIRED=false` in `.env.local` — the app falls back to an in-memory seed database so you can click around without signing in. Flip it back to `true` before you're done; it's what production runs.

## Environment variables

| Name | Where it's read | What it's for |
|---|---|---|
| `VITE_SUPABASE_URL` | client + server | Supabase project URL. Safe to expose — RLS does the real gatekeeping. |
| `VITE_SUPABASE_ANON_KEY` | client + server | Public anon key. Also safe to expose, also RLS-gated. |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Bypasses RLS entirely. Deliberately not `VITE_`-prefixed so it never reaches the browser bundle. Only ever touched inside `src/lib/supabase/admin.ts`, which handles the "invite team member" flow. Treat it like a master key. |
| `SUPABASE_PROJECT_REF` | — | Not read anywhere in the app code. Kept around for manual Supabase CLI commands only. |
| `VITE_AUTH_REQUIRED` | client | `false` bypasses Supabase auth and uses seed data — local dev convenience only. Must be `true` in production. |

> **Sharp edge:** on Vercel, all five of these are marked `Sensitive`, which means their values can't be viewed again once saved — only overwritten. A bad paste (empty, truncated, stray whitespace) is invisible until something that depends on it breaks in production. If a feature fails with a "Supabase not configured" style error and the variable clearly exists in the dashboard, don't trust that it's correct — delete and re-add it with a fresh copy-paste before looking anywhere else.

## How it's built

No separate backend — Supabase *is* the backend, and RLS policies are the real authorization boundary (client-side role checks are UX only, not security).

**Where things live:**

- `src/routes/` — one file per page, TanStack Start's file-based router
- `src/lib/crm/provider.tsx` — the whole app's data layer: one snapshot query, every mutation invalidates it
- `src/lib/crm/selectors.ts` — derived calculations, incl. the opportunity pricing formula
- `src/lib/crm/types.ts` — domain types: regions, segments, stages, roles
- `src/lib/supabase/repository.ts` — every direct Supabase call lives here
- `src/lib/supabase/admin.ts` — the only file allowed to touch the service-role key
- `src/server.ts` — custom SSR entry; catches crashes and renders a friendly error page instead of a blank 500
- `supabase/migrations/` — numbered SQL migrations, run by hand in the Supabase SQL Editor (no CLI runner wired up)

**Business logic worth knowing before you touch it:**

- **Opportunity pricing** (`selectors.ts`) — a 36-month base licensing fee per machine, plus a low/high projected-revenue range from real YKE menu pricing (boba $5.50–7.00, ramen $12.99–14.99) × rep-entered daily unit estimates × the account's operating days/year. It's gross revenue only — there's no cost/margin field anywhere in the schema yet.
- **Regions & segments** (`types.ts`) — 8 regions (North America / Europe / UK / Australia / North Asia / Southeast Asia / Taiwan / Unknown) and a 12-value segment list, both hand-verified against real account data by email domain, not guessed.
- **Roles** — `sales_rep | manager | marketing | admin`. Enforced twice: client-side in `AppShell.tsx` (nav visibility + silent redirect off restricted routes) and server-side via Postgres RLS policies (`auth_role()`, `auth_region()` helper functions). If the two ever disagree, the RLS policy is the one actually enforcing anything.

## Deploying

Push to `main` → Vercel's GitHub integration builds and deploys automatically. No manual step, no staging environment — production has been shipped to directly.

```sh
git add <files>
git commit -m "..."
git push origin main
# Vercel picks it up within seconds — check vercel.com/yke/yke-sales-compass/deployments
```

Nitro (the build tool underneath Vite) auto-detects Vercel and outputs its Build Output API format directly — this has been confirmed working correctly, so if a deploy misbehaves, look at env vars and commit metadata before suspecting the build target.

## Incident log

Two real outages so far, both after moving off Lovable's hosting onto independent Vercel deploys. Worth reading before debugging a deploy that "should just work."

**2026-08-20 — Production threw "Missing Supabase environment variables" on every request.**
All four Supabase env vars were correctly named and scoped in the Vercel dashboard, and a fresh, non-cached build succeeded — yet the deployed bundle still had no values. Root cause: the stored *value* on a `Sensitive`-flagged variable was bad from an earlier paste, and Sensitive values can't be inspected after creation to catch that.
*Fix — delete and recreate the variable with a careful fresh paste, then redeploy.*

**2026-08-21 — Deploy status showed "Blocked," site never updated.**
Vercel's own error message pointed at team billing ("upgrade to Pro and add them as a collaborator"), which was a red herring — the team only has one member, who owns everything. The actual cause: the local git commit author email wasn't a verified email on the pushing GitHub account, so Vercel couldn't authorize the deploy.
*Fix — set the correct `git config user.email` to a verified GitHub email, amend the commit, push again.*

## Questions

Cindy — cindy.lin@yokaiexpress.com
