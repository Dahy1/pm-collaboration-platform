This document outlines the **PostgreSQL Schema** and **Backend Architecture** for "Nexus." It is designed for a Supabase-native environment, utilizing Row-Level Security (RLS), Postgres Triggers for event-driven logic, and specialized indexing for high-concurrency collaboration.

---

## 1. Database Schema (DDL)

### 👥 Users & Organizations

```sql
CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE users (
    id uuid PRIMARY KEY REFERENCES auth.users(id), -- Sync with Supabase Auth
    full_name text,
    email text UNIQUE,
    avatar_url text,
    current_status text DEFAULT 'offline', -- active, away, offline
    organization_id uuid REFERENCES organizations(id),
    last_active_at timestamptz DEFAULT now()
);

```

### 🔐 Access Control (NARE)

```sql
CREATE TYPE user_role_type AS ENUM ('owner', 'admin', 'account_manager', 'project_manager', 'team_member');

CREATE TABLE access_relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES users(id) ON DELETE CASCADE,
    object_id uuid REFERENCES users(id) ON DELETE CASCADE,
    relationship_type text NOT NULL, -- 'managed_by', 'collaborator'
    permissions jsonb DEFAULT '{}'::jsonb, -- e.g. {"task_assign": true}
    UNIQUE(subject_id, object_id)
);

CREATE TABLE user_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id uuid REFERENCES users(id) ON DELETE CASCADE,
    blocked_id uuid REFERENCES users(id) ON DELETE CASCADE,
    is_two_way boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

```

### 📋 Task System

```sql
CREATE TABLE boards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    is_private boolean DEFAULT false,
    created_by uuid REFERENCES users(id)
);

CREATE TABLE board_members (
    board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    role text DEFAULT 'editor', -- 'admin', 'editor', 'viewer'
    PRIMARY KEY (board_id, user_id)
);

CREATE TABLE columns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
    name text NOT NULL,
    position float8 NOT NULL -- Float8 allows easier reordering (e.g., 1.5 between 1 and 2)
);

CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE, -- Denormalized for RLS
    column_id uuid REFERENCES columns(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    deadline_at timestamptz,
    completed_at timestamptz,
    is_completed boolean DEFAULT false,
    created_by uuid REFERENCES users(id),
    position float8 NOT NULL
);

CREATE TABLE task_assignees (
    task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);

```

### 💬 Chat System

```sql
CREATE TABLE chat_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    board_id uuid REFERENCES boards(id) ON DELETE SET NULL,
    type text NOT NULL, -- 'dm', 'group', 'space'
    metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE chat_members (
    room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES users(id),
    parent_id uuid REFERENCES messages(id), -- For threading
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

```

### 📊 Performance & Scheduling

```sql
CREATE TABLE user_performance_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    date date DEFAULT current_date,
    reliability_score decimal(5,2),
    overdue_count int,
    UNIQUE(user_id, date)
);

CREATE TABLE schedule_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    event_type text NOT NULL, -- 'busy', 'ooo', 'focus'
    start_at timestamptz NOT NULL,
    end_at timestamptz NOT NULL
);

```

---

## 2. Indexing Strategy

- **Performance Hotspots:**
- `tasks(column_id, position)`: For fast kanban rendering.
- `messages(room_id, created_at DESC)`: For chat history pagination.
- `access_relationships(subject_id)`: Crucial for NARE permission resolution.
- `task_assignees(user_id)`: To quickly fetch "My Tasks."

- **JSONB Indexing:** \* `CREATE INDEX idx_notif_pref ON notification_preferences USING GIN (settings)`: For fast lookup of user notification channels.

---

## 3. Row-Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Only members of the board can see tasks
CREATE POLICY board_member_access ON tasks
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM board_members
        WHERE board_members.board_id = tasks.board_id
        AND board_members.user_id = auth.uid()
    )
);

-- Policy: Chat access
CREATE POLICY chat_member_access ON messages
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM chat_members
        WHERE chat_members.room_id = messages.room_id
        AND chat_members.user_id = auth.uid()
    )
);

-- Policy: Access Relationships (NARE)
-- Subject can only see objects they have a relationship with
CREATE POLICY nare_visibility ON users
FOR SELECT
USING (
    id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM access_relationships
        WHERE subject_id = auth.uid() AND object_id = users.id
    )
);

```

---

## 4. Real-Time Architecture

Supabase Realtime listens to the PostgreSQL Write-Ahead Log (WAL).

- **Task Updates:** Clients subscribe to `tasks:column_id=eq.{id}`. When a task is moved, the payload includes the new `position` and `column_id`.
- **Presence:** Utilizes `Presence` protocol (CRDT-based) to track "User is Typing" and "Status: Away" without saturating the database with tiny writes.
- **Message Delivery:** Clients subscribe to `messages:room_id=eq.{id}`.

---

## 5. Event System & Background Jobs

Postgres Functions + Triggers are used as the "Outbox" for events.

1. **Trigger:** `AFTER UPDATE ON tasks` -> Check if `is_completed` changed.
2. **Function:** Insert record into `webhook_events` table.
3. **Background Job (Edge Function):** A Cron job (using `pg_cron`) or an Edge Function listens to the `webhook_events` table to:

- Calculate performance score updates.
- Dispatch Push Notifications via FCM.
- Process "Daily Digest" emails.

---

## 6. Data Consistency & Performance Strategy

- **Transactions:** Use database-level transactions for "Move Task" operations to ensure `position` updates do not result in duplicates.
- **Pagination:** Keyset pagination (Cursor-based) using `created_at` or `position` to ensure consistent performance as tables grow to millions of rows.
- **Concurrency:** Use `SELECT FOR UPDATE` on tasks when updating deadlines to prevent race conditions between two managers editing the same record.
- **Cascading:** `ON DELETE CASCADE` is applied to `board_members` and `task_assignees` to ensure clean user removal, but `SET NULL` is used for `messages.sender_id` to preserve chat history context.
