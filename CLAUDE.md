# Project Instructions

We are building a project management + collaboration SaaS.

## Product Modules

Read PRDs from `/docs/prds` before implementing any feature.

Core modules:

1. Core system, routing, auth
2. Kanban/tasks
3. Access control
4. Performance scoring
5. Chat
6. Notifications
7. Admin panel
8. Scheduling
9. Database/backend

## Non-Negotiables

- TypeScript only.
- No feature may be implemented without checking the relevant PRD.
- Routing must be URL-based and refresh-safe.
- Never store app state only in memory if it affects navigation.
- Every task, board, chat, user profile, and notification must support deep links where relevant.
- Backend permission checks are mandatory. Frontend checks are not enough.
- Supabase RLS must protect all tenant data.
- No direct database access from UI except through approved Supabase client patterns.
- Every major change must include tests or a clear reason why tests are not applicable.

## Routing Requirements

Use persistent routes:

- /dashboard
- /boards
- /boards/[boardId]
- /boards/[boardId]/tasks/[taskId]
- /chat
- /chat/[chatId]
- /admin/users
- /admin/users/[userId]
- /schedule
- /notifications

Refreshing any page must restore the same screen.

## Development Rules

Before coding:

1. Read relevant PRD.
2. Inspect existing architecture.
3. Create implementation plan.
4. Implement in small commits.
5. Run lint, typecheck, and tests.
6. Summarize changed files.

## Git Rules

- Work on feature branches only.
- Commit after each stable milestone.
- Never push secrets.
- Never modify production migration files without creating a new migration.

## Security Rules

- Never expose service role keys to frontend.
- Never disable RLS to make something work.
- Do not create broad “allow all authenticated users” policies.
- Admin features must be enforced backend-side.

## UI Rules

- Use shadcn/ui and Tailwind.
- Mobile-responsive first.
- Keep layout clean and SaaS-like.
- Avoid one-off styling unless necessary.

## Claude Behavior

- Prefer plan mode before implementation.
- Ask before destructive actions.
- Do not ask for confirmation for safe edits, formatting, linting, test runs, or file creation inside the repo.
