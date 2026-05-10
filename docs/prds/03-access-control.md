# Product Requirements Document (PRD): Access Control & Permissions System

**Version:** 1.2

**Status:** Implementation Ready

**Reference:** Extends Nexus Core System v1.0 & Task System v1.1

---

## 1. Executive Summary

This document defines the **Nexus Access & Relationship Engine (NARE)**. Unlike traditional flat RBAC models, Nexus utilizes a **Directional Relationship-Based Access Control (ReBAC)** model. Access is not merely a byproduct of a role but is derived from explicit directional relationships between users, ensuring that management and interaction capabilities are contextually grounded and strictly governed.

---

## 2. Role System Design (Base Layer)

Roles define the **maximum possible scope** a user can have within the organization.

| Role                     | Description               | Default Scope                                             |
| ------------------------ | ------------------------- | --------------------------------------------------------- |
| **Owner**                | Root user / Billing Admin | Global: All users, all boards, all settings.              |
| **Account Manager (AM)** | Department/Client lead    | Cross-team: Access to multiple PMs and their teams.       |
| **Project Manager (PM)** | Team/Project lead         | Team-level: Direct access to assigned Team Members.       |
| **Team Member (TM)**     | Individual Contributor    | Individual: Personal tasks and shared project visibility. |

---

## 3. Access Relationship Model (The "Directional" Core)

Access is defined as a directional link: `Subject (User A) → Object (User B)`.

- **Directional Nature:** If PM A has "Manage" access to TM B, TM B does **not** automatically have access to PM A’s schedule or tasks.
- **Relationship Types:**
- **MANAGED_BY:** Grants full task assignment and schedule visibility.
- **CONTRIBUTOR_TO:** Grants view-only access to work context.
- **COLLABORATOR:** Grants chat and mention capabilities.

---

## 4. Permission Types & Matrix

Permissions are categorized into functional silos.

### 4.1 Task Permissions

- `TASK_ASSIGN`: Ability to push a task into User B’s queue.
- `TASK_EDIT`: Ability to modify User B’s existing tasks.
- `TASK_VIEW`: Ability to see User B’s private/assigned task list.

### 4.2 Schedule Permissions

- `SCHED_VIEW`: See busy/free status and specific calendar entries.
- `SCHED_EDIT`: Add/Remove items from User B’s schedule (typically AM/PM only).

### 4.3 Chat Permissions

- `CHAT_INITIATE`: Start a 1:1 DM.
- `CHAT_MENTION`: Ability to @tag User B in channels.

---

## 5. Chat Restriction System (The "Gatekeeper")

Admins can enforce communication siloes that override all relationships.

- **Restriction Types:**
- **ONE_WAY_BLOCK:** User A cannot message/mention User B, but B can message A.
- **TWO_WAY_SILENCE:** No direct communication possible between A and B.

- **Priority:** Restrictions are evaluated **first**. If a restriction exists, all relationship-based permissions for that specific functional silo (Chat) are void.

---

## 6. Permission Resolution Engine

The "Brain" of the system. When a request is made (`Can A do X to B?`), the engine follows this strict evaluation order:

### 6.1 Evaluation Algorithm

1. **System Override:** Is A an `Owner`? (If Yes, ALLOW, unless a TWO_WAY_SILENCE block is present).
2. **Restriction Check:** Is there an explicit `Restriction` (Block) between A and B for this action? (If Yes, DENY).
3. **Explicit Relationship:** Does A have a `Relationship` record with B that includes permission X? (If Yes, ALLOW).
4. **Board Context:** Is the action happening within a Board?

- Check Board Role (from Kanban PRD).
- _Rule:_ Board-level "Allow" cannot override a Global "Deny/Block."

5. **Default Role Policy:** Does A’s base role allow this action globally? (Standard TM behavior).
6. **Final Fallback:** DENY.

---

## 7. Admin Control System

A centralized interface for the "Access Graph."

- **Relationship Manager:** A searchable list/grid where Admins select "Subject" and "Object" to define links.
- **The "Impersonation" Tester:** Allows Admins to select a user and view the system "as them" to verify visibility.
- **Global Restriction Matrix:** A high-level view of all communication blocks within the organization.

---

## 8. Data Model (Schema)

```sql
-- Base Roles
CREATE TYPE user_role AS ENUM ('OWNER', 'ACCOUNT_MANAGER', 'PROJECT_MANAGER', 'TEAM_MEMBER');

-- Directional Relationships
CREATE TABLE access_relationships (
    id UUID PRIMARY KEY,
    subject_user_id UUID REFERENCES users(id),
    object_user_id UUID REFERENCES users(id),
    relationship_type VARCHAR(50), -- e.g., 'MANAGED_BY'
    permissions JSONB, -- e.g., {"task_assign": true, "sched_view": true}
    created_at TIMESTAMP
);

-- Communication Blocks
CREATE TABLE chat_restrictions (
    id UUID PRIMARY KEY,
    user_a UUID REFERENCES users(id),
    user_b UUID REFERENCES users(id),
    restriction_type VARCHAR(20), -- 'ONE_WAY', 'TWO_WAY'
    created_by UUID REFERENCES users(id) -- Admin who enforced it
);

```

---

## 9. API Design

| Endpoint                | Method   | Description                                               |
| ----------------------- | -------- | --------------------------------------------------------- |
| `/access/grant`         | `POST`   | Creates a relationship between two users.                 |
| `/access/revoke`        | `DELETE` | Removes a relationship link.                              |
| `/access/check`         | `GET`    | `?sub=id&obj=id&action=task_assign` -> Returns Boolean.   |
| `/access/restrictions`  | `POST`   | Enforce a chat block between users.                       |
| `/users/:id/manageable` | `GET`    | Returns list of all users the subject has authority over. |

---

## 10. Security Architecture

- **Backend Middleware:** Every service (Task, Chat, Sched) must call the Permission Resolution Engine via an internal gRPC or localized library call before processing logic.
- **Row-Level Security (RLS):** If using Postgres, policies are set on the `tasks` table:
- `USING (exists (SELECT 1 FROM access_relationships WHERE subject_user_id = auth.uid() AND object_user_id = tasks.assignee_id))`

- **Token Claims:** User roles are baked into JWTs; however, specific relationships are **not** (too dynamic). Relationships must be checked against a cache.

---

## 11. Edge Cases

- **Circular Permissions:** User A manages B, and B manages A. System handles this as two separate directional entries. Valid for "Peer Review" scenarios.
- **Role Downgrade:** If an AM is downgraded to TM, the system triggers a cleanup job to flag/remove any `MANAGED_BY` relationships that exceed the new role's maximum scope.
- **Orphaned Relationships:** If a user is deleted, all `subject` and `object` entries in the `access_relationships` table are deleted (`ON DELETE CASCADE`).

---

## 12. Scalability Considerations

- **Permission Caching:** Store the "Access Graph" in **Redis**. Use a `BitMap` or `Set` for rapid "Can A access B" lookups ($O(1)$ complexity).
- **Graph Depth:** Limit explicit relationships to a depth of 1. Avoid recursive lookups (e.g., A manages B, B manages C, therefore A manages C) to prevent $N+1$ query issues. Hierarchical access should be flattened at the database level.
- **Batch Evaluation:** For views listing many users (like a directory), the API should support batch permission checks: `check?sub=id&objects=[id1, id2, id3]`.
