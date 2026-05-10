# Product Requirements Document (PRD): Kanban & Task Management System

**Version:** 1.1

**Status:** Implementation Ready

**Reference:** Extends Nexus Core System v1.0

---

## 1. Executive Summary

The Kanban & Task Management system is the primary functional module of the Nexus platform. It transforms the core workspace into an actionable project management environment. This module introduces a hierarchical structure (Board > Column > Task) with a focus on high-fidelity real-time synchronization, deep-linked routing, and performance-tracking hooks for future analytics.

---

## 2. Board System Design

Boards serve as the top-level container for specific projects or workstreams.

- **Attributes:**
- `id`: UUID (Primary Key).
- `workspaceId`: Reference to Core Workspace.
- `name`: String (max 100 chars).
- `description`: Text (Markdown support).
- `visibility`: `PRIVATE` (members only) or `SHARED` (all workspace users).
- `status`: `ACTIVE`, `ARCHIVED`.

- **Membership:** Boards inherit workspace users but allow specific assignment. A user must be a Workspace Member to be added to a Board.

---

## 3. Column System Design

Columns define the workflow stages within a board.

- **Attributes:**
- `id`: UUID.
- `boardId`: Reference to Board.
- `name`: String (e.g., "Backlog", "In Review").
- `position`: Integer (Zero-indexed for drag-and-drop ordering).

- **Behavior:** \* Every board must have at least one column.
- Deleting a column requires a "target column" selection to migrate existing tasks.

---

## 4. Task System Design

The "Task" is the atomic unit of work, designed for granular tracking.

### 4.1 Fields & Metadata

- **Core:** `title`, `description` (Rich Text), `status` (maps to `columnId`), `isCompleted` (Boolean).
- **Temporal:** `deadlineAt` (ISO 8601, Date + Time REQUIRED), `startTime` (Optional), `completedAt` (Timestamp).
- **Assignments:** `assigneeIds` (Array of UUIDs). Supports multiple assignees.
- **System Hooks:** `createdAt`, `createdBy`, `updatedAt`.

### 4.2 Task Lifecycle & Performance Logic

The system calculates performance metrics on-the-fly:

1. **Created:** Entry into the database.
2. **Overdue:** System flag triggers if `currentTime > deadlineAt` AND `isCompleted == false`.
3. **Completion Logic:**

- **Completed ON TIME:** `completedAt <= deadlineAt`.
- **Completed LATE:** `completedAt > deadlineAt`.
- _Note:_ Changing a deadline after a task is marked completed does not retroactively change the "Late" flag unless the task is reopened.

---

## 5. Routing & Deep Linking

Building on the Core Routing system, the Task module utilizes nested routes.

- **Patterns:**
- `/board/:boardId`: Loads the Board layout and all columns/tasks.
- `/board/:boardId/task/:taskId`: Loads the Board in the background and opens the Task Detail Modal.

- **State Restoration:**
- On direct link access (e.g., from an email), the app fetches `task/:taskId` first to identify the `boardId` if not present, then hydrates the board view.
- Closing the Task Modal returns the user to `/board/:boardId` via browser `history.back()`.

---

## 6. Permissions Model (Board-Level)

Permissions are checked via a middleware that combines Workspace Role + Board Role.

| Action                  | Viewer | Editor   | Admin |
| ----------------------- | ------ | -------- | ----- |
| View Board/Tasks        | Yes    | Yes      | Yes   |
| Create/Edit Tasks       | No     | Yes      | Yes   |
| Move Tasks (Drag/Drop)  | No     | Yes      | Yes   |
| Delete Tasks            | No     | Own Only | Yes   |
| Manage Columns/Settings | No     | No       | Yes   |
| Mark Task Complete      | No     | Yes      | Yes   |

---

## 7. Drag & Drop Architecture

- **Library:** `@hello-pangea/dnd` or `dnd-kit`.
- **Optimistic UI:** When a task is moved, the UI updates locally immediately.
- **Sync Flow:**

1. Client sends `MOVE_TASK` event (taskId, sourceCol, destCol, newIndex).
2. Server validates permissions.
3. Server updates `position` and `columnId`.
4. Broadcast `TASK_MOVED` to all clients in the Board room.

- **Conflict Resolution:** If two users move the same task, the server's timestamped state wins; the second client receives a "State Reconcile" event to snap the card to the correct position.

---

## 8. Table View System

A spreadsheet-like alternative to the Kanban board for high-density management.

- **Features:**
- **Virtual Scrolling:** Only render visible rows (crucial for 1000+ tasks).
- **Inline Edits:** Clicking a cell (e.g., Deadline or Assignee) opens a mini-popper editor.
- **Sorting:** Multi-column sort (e.g., Sort by Deadline, then by Priority).

---

## 9. Activity Logging

Every Task contains an `activity_logs` table.

- **Payload:** `{ userId, actionType, previousValue, newValue, timestamp }`.
- **Tracked Actions:** Title change, Description change, Assignee added/removed, Column move, Deadline change, Completion toggle.

---

## 10. Real-Time Sync Design

Utilizes the Core WebSocket Gateway.

- **Payload Example (Task Edit):**

```json
{
  "type": "TASK_UPDATED",
  "boardId": "b123",
  "data": {
    "taskId": "t456",
    "fields": { "title": "New Title" },
    "user": { "id": "u789", "name": "Jane" }
  }
}
```

- **Presence:** Show "Active Avatars" in the task modal if multiple users are viewing the same task.

---

## 11. Data Model (Schema)

```text
Board
  id: uuid
  workspace_id: uuid (FK)
  name: varchar

Column
  id: uuid
  board_id: uuid (FK)
  name: varchar
  position: int

Task
  id: uuid
  column_id: uuid (FK)
  title: varchar
  description: text
  deadline_at: timestamp
  completed_at: timestamp
  is_completed: boolean

TaskAssignment
  task_id: uuid (FK)
  user_id: uuid (FK)

```

---

## 12. API Design

| Method  | Endpoint            | Description                                 |
| ------- | ------------------- | ------------------------------------------- |
| `GET`   | `/boards/:id`       | Fetch board, columns, and tasks.            |
| `POST`  | `/boards/:id/tasks` | Create a new task.                          |
| `PATCH` | `/tasks/:id`        | Update task fields (Title, Deadline, etc.). |
| `PATCH` | `/tasks/:id/move`   | Move task (column_id + index).              |
| `POST`  | `/tasks/:id/assign` | Add user(s) to task.                        |

---

## 13. Edge Cases

- **No Assignee:** Valid state. Tasks appear in "Unassigned" filters.
- **User Removed from Board:** Tasks remain assigned to the `userId` for historical integrity, but the UI flags the user as "Inactive/Removed."
- **Simultaneous Edits:** Implementation of "Field-Level Locking" or "Last Write Wins." Description field should use a debounced auto-save (3s).
- **Task Deleted while Open:** If User A deletes a task while User B has the modal open, User B receives a `TASK_DELETED` socket event that forces the modal to close with a "This task is no longer available" toast.

---

## 14. Scalability Considerations

- **Pagination:** Use "Infinite Scroll" for Kanban columns. Do not load all 1000 tasks at once; load the first 50 per column.
- **Database:** Index `column_id` and `board_id`. Use a composite index for `(column_id, position)`.
- **Batching:** Bulk operations (assigning 50 tasks to one user) must be handled in a single database transaction to prevent partial state updates.
