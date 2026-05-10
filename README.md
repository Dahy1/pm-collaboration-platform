# Nexus

Project management + collaboration SaaS. Monorepo: Next.js web app, Expo mobile app, shared packages, Supabase backend.

## Workspace layout

```
apps/
  web/           Next.js 15 (App Router) + TypeScript + Tailwind
  mobile/        Expo + React Native + TypeScript (placeholder)
packages/
  ui/            Shared React UI primitives
  types/         Shared TypeScript types
  utils/         Shared utility functions
  config/        Shared config (routes, constants, tsconfig base)
docs/prds/       Product Requirement Documents (read before implementing)
supabase/        Migrations, functions, seed
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Optional, for mobile: Expo Go app or Xcode/Android Studio

## Setup

```bash
# 1. Install dependencies (workspace-wide)
pnpm install

# 2. Configure environment (see "Environment" below)
cp apps/web/.env.example apps/web/.env.local
# then fill in values

# 3. Apply Supabase migrations (see "Supabase" below)

# 4. Run the web app
pnpm dev
# → http://localhost:3000

# 5. (Optional) Run the mobile app
pnpm dev:mobile
```

## Environment

The web app requires:

| Variable                        | Where                          | Notes                                        |
| ------------------------------- | ------------------------------ | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API | e.g. `https://xxx.supabase.co`            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | The **anon** key (NOT the service role key) |

These are validated at startup via Zod (`apps/web/src/lib/env.ts`); the app fails fast if either is missing. Service-role keys must never be added to the web app.

## Supabase

### Initial setup (one-time, manual)

1. Create a Supabase project at <https://supabase.com>.
2. Copy `Project URL` and `anon public` key into `apps/web/.env.local`.
3. **Email auth provider** is enabled by default. In **Authentication → Providers → Email**, configure:
   - Enable email confirmations (recommended) **or** disable them for local development.
   - Set **Site URL** to `http://localhost:3000`.
   - Add `http://localhost:3000/auth/callback` to **Redirect URLs**.
4. Apply the initial migration. Either:
   - **Supabase CLI (recommended):** `supabase link --project-ref <ref>` then `supabase db push`.
   - **Dashboard SQL editor:** paste the contents of
     `supabase/migrations/20260510000000_init_auth_tenancy.sql` and run.

### Tables created

- `organizations`, `profiles`, `organization_members`
- `user_role` enum (`owner | admin | account_manager | project_manager | team_member`)
- Trigger: new `auth.users` row → matching `profiles` row.

### RLS

RLS is enabled on every table. See migration file for policies. No "allow all authenticated" policies are used.

## Scripts

Run from the repo root:

| Script             | Description                            |
| ------------------ | -------------------------------------- |
| `pnpm dev`         | Start Next.js dev server               |
| `pnpm dev:mobile`  | Start Expo dev server                  |
| `pnpm build`       | Build all packages                     |
| `pnpm typecheck`   | TypeScript check across the workspace  |
| `pnpm lint`        | Lint across the workspace              |
| `pnpm test`        | Run tests across the workspace         |

## Routes (Phase 0 placeholders)

- `/dashboard`
- `/boards`, `/boards/[boardId]`, `/boards/[boardId]/tasks/[taskId]`
- `/chat`, `/chat/[chatId]`
- `/admin/users`, `/admin/users/[userId]`
- `/schedule`
- `/notifications`

## Conventions

- TypeScript strict everywhere.
- Read the relevant PRD in `docs/prds/` before implementing a feature.
- All routes must be URL-based and refresh-safe.
- Multi-tenant: every domain table carries `organization_id` and is protected by Supabase RLS.
- See `CLAUDE.md` for the full set of project rules.

## Status

Phase 0 — initial monorepo scaffold. No business logic yet.
