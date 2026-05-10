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

# 2. Run the web app
pnpm dev
# → http://localhost:3000

# 3. (Optional) Run the mobile app
pnpm dev:mobile
```

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
