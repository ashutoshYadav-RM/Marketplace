# Hyperlocal Commerce — Phase 0

Web-first, pickup-first local commerce platform. Full architecture, schema,
and roadmap: see the **Hyperlocal Commerce Blueprint** (published as an
artifact earlier in this project — ask for the link if you don't have it).

This README covers what exists right now and how to run it.

## Stack

Next.js 16 (App Router, Turbopack, TypeScript strict) · Tailwind CSS v4 ·
Supabase (Postgres + PostGIS, Auth, RLS, Realtime, Storage) · next-intl ·
TanStack Query · react-hook-form + zod.

> **Next.js 16 note:** this version renamed `middleware.ts` to `proxy.ts`
> (same execution model, new file/function name — see
> `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
> If you're used to `middleware.ts`, that's where the session-refresh /
> route-gating logic lives now: [src/proxy.ts](src/proxy.ts).

## Getting started

1. **Create a Supabase project** (or install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run `supabase start` for local dev — needs Docker).
2. Copy the env file and fill it in from Project Settings → API:
   ```
   cp .env.local.example .env.local
   ```
3. Apply the schema:
   ```
   supabase link --project-ref <your-project-ref>
   supabase db push          # runs supabase/migrations/0001_init.sql
   ```
   For local dev instead: `supabase db reset` (runs migrations + `supabase/seed.sql`).
4. In the Supabase dashboard, enable **Phone** as an Auth provider and
   configure an SMS provider (Twilio, MessageBird, …) — phone OTP is the
   primary customer sign-in (see blueprint §03). Email/password works with
   no extra setup.
5. Regenerate typed database types (replaces the `any` placeholder):
   ```
   npx supabase gen types typescript --linked > src/lib/supabase/types.ts
   ```
6. ```
   npm install
   npm run dev
   ```

## What Phase 0 shipped

- **Schema & security** — [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql): every table from blueprint §02, RLS on all of them, the `transition_order_status` / `transition_booking_status` / `verify_and_complete_pickup` functions that are the *only* way order and booking status ever change (§05/§06), and the `handle_new_user` trigger that creates a `profiles` row for every new `auth.users` row.
- **Reference data** — [supabase/seed.sql](supabase/seed.sql): 5 countries, the V1 product/service category taxonomy.
- **Three Supabase clients** — browser, server (cookie-bound), service-role (server-only, `server-only`-guarded) in [src/lib/supabase/](src/lib/supabase/).
- **Auth** — phone OTP + email/password, one `/auth/sign-in` screen for both, session refresh + route gating in `proxy.ts`.
- **i18n scaffold** — English-only, no URL prefix, cookie-selected locale (`src/i18n/`, `messages/en.json`). Adding a language later is a JSON file plus one array entry, not a routing rewrite.
- **Design tokens & primitives** — semantic tokens in `globals.css` (light/dark), `Button`/`Input`/`Card`/`Badge`/`EmptyState`/`Skeleton` in `src/components/ui/`.
- **Customer home shell** — search bar, browser-geolocation prompt, live category row (reads from the database), and honest empty states for every section the brief describes (nearby shops, offers, services, recently viewed, reorder) — nothing fake, nothing lorem.
- **Merchant / Admin shells** — auth-gated (`/merchant`, `/admin`), the admin shell additionally checks `app_admins` server-side. Both show a scoped "coming in Phase N" state rather than empty pages.

## What's stubbed on purpose

`/search` renders but doesn't query yet — that's Phase 3. There's no
catalog, no cart, no orders yet — Phases 1–4. See the roadmap (blueprint
§12) for the full sequence.

## Module boundary rule

Everything under `src/modules/<name>/` follows `domain/` (types + zod
schemas) → `data/` (private, typed Supabase queries) → `service/` (public
business logic) → `hooks/` + `components/`. Other modules may only import
from another module's `service/` (or top-level exports meant to be public) —
never reach into `data/` directly. This is the boundary a future service
extraction would cut along; see blueprint §01.
