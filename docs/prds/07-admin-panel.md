# Product Requirements Document (PRD): User Panel & Admin System

**Version:** 1.6

**Status:** Implementation Ready

**Reference:** Extends Nexus Core v1.0, Kanban v1.1, Access Control v1.2, Performance v1.3, and Chat v1.4

---

## 1. Executive Summary

The **Nexus Admin Console (NAC)** is the command center for organization owners and administrators. It provides a centralized interface for managing the user lifecycle, enforcing the **Nexus Access & Relationship Engine (NARE)**, and monitoring both system-wide productivity and communication compliance. This system ensures that as an organization scales, administrators maintain granular control over who can do what, with whom, and how effectively.

---

## 2. User Management System

The NAC provides full CRUD (Create, Read, Update, Delete) capabilities over the user entity.

### 2.1 Role & Status Management

- **Roles:** Owner, Account Manager (AM), Project Manager (PM), Team Member (TM).
- **Fields:** \* `Identity`: Name, Email, Profile Picture.
- `Metadata`: Role, Account Status (Active/Suspended), Created At, Last Active.
- `Real-time Presence`: Active, Away, Offline (System-derived).

- **Actions:** \* **Invite:** Trigger magic-link or password setup email.
- **Suspend:** Instant session termination and login block.
- **Impersonate:** (Owner Only) View the platform through the user's specific access lens for troubleshooting.

---

## 3. User Panel UI/UX

The main Admin Dashboard is a high-density data grid designed for rapid oversight.

- **Primary View:** A sortable, filterable table of all users.
- **Key Columns:** Role, Current Status, Active Tasks count, **30-Day Reliability Score**, and Last Activity.
- **Quick Actions:** Reset Password, Change Role, Edit Access, and View Profile.

---

## 4. User Profile Structure (Admin View)

Clicking a user in the Panel opens a comprehensive profile drill-down.

### 4.1 Task & Performance Overview

- **Current Load:** List of active tasks across all boards.
- **Performance Health:** A visual trend line of the user's "Success Rate" over the last 90 days.
- **Breakdown:** On-time vs. Late vs. Overdue counts.

### 4.2 Schedule & Activity

- **Availability:** View user's calendar/schedule blocks. Admins can manually override "Away" status if a user is improperly logged.
- **System Activity:** A feed of the user's recent actions (e.g., "Moved Task X to Done", "Joined Space Y").

---

## 5. Access Management Panel

This is the UI implementation of the **NARE Directional Model**.

- **Access Matrix:** A grid where the Y-axis is "Subjects" and the X-axis is "Objects." Admins click intersections to define `MANAGED_BY` or `COLLABORATOR` links.
- **Relationship Graph:** A visual node-based map showing the hierarchy and directional links between users.
- **Bulk Assignment:** Select multiple Team Members and link them to a single Project Manager in one action.

---

## 6. Chat Oversight System

NCE (Chat) oversight focuses on compliance and security without violating daily privacy.

- **Audit Logs:** Metadata-only view (Who messaged whom, when, and frequency) by default.
- **Audit Mode:** Only an **Owner** can enable content-viewing for a specific user/channel. This action triggers a "High Priority" notification to all other Admins to ensure mutual accountability.
- **Communication Blocks:** A dedicated interface to enforce **One-Way** or **Two-Way** silence between users, overriding any board or role permissions.

---

## 7. Performance Monitoring System

Aggregate view of organizational health.

- **Team Success Rates:** Compare performance between different Project Managers and their respective teams.
- **Bottleneck Identification:** Flag users with consistently growing "Overdue" penalties before they impact project delivery.
- **Leaderboard:** Optional view of top-performing "Reliable" users to encourage high success rates.

---

## 8. Activity Logging System (Audit Trail)

Every action within the NAC is recorded in an immutable log.

- **Admin Logs:** `[Admin User] [Action] [Target User/Resource] [Timestamp] [IP Address]`.
- **Change Delta:** Logs must store the `Before` and `After` state of sensitive changes (e.g., Role change from TM to Owner).
- **Retention:** Logs are immutable and retained for 365 days by default for compliance.

---

## 9. Data Model (Schema)

```sql
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY,
    admin_id UUID REFERENCES users(id),
    action_type VARCHAR(100), -- 'USER_ROLE_CHANGE', 'ACCESS_GRANT', 'CHAT_BLOCK'
    target_id UUID, -- The user/resource being acted upon
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Profile Extension for Admin Stats
CREATE VIEW admin_user_stats AS
SELECT
    u.id,
    u.name,
    u.role,
    p.rolling_30d_score,
    (SELECT COUNT(*) FROM tasks WHERE assignee_id = u.id AND status != 'DONE') as active_tasks
FROM users u
JOIN user_performance_aggregates p ON u.id = p.user_id;

```

---

## 10. API Design

| Method  | Endpoint                     | Description                                          |
| ------- | ---------------------------- | ---------------------------------------------------- |
| `GET`   | `/admin/users`               | Fetch list of all users with performance aggregates. |
| `POST`  | `/admin/users`               | Create/Invite a new user.                            |
| `PATCH` | `/admin/users/:id/role`      | Update a user's global role.                         |
| `GET`   | `/admin/logs`                | Fetch system-wide audit trail.                       |
| `POST`  | `/admin/access/relationship` | Bulk create directional access links.                |

---

## 11. Security Considerations

- **Role Protection:** Only users with the `Owner` role can access the `Admin Audit Logs` or `Audit Mode` for Chat.
- **MFA:** Mandatory Multi-Factor Authentication for any user with `Admin` or `Owner` roles.
- **Session Termination:** Changing a user's role or access level must immediately invalidate their current JWT to force a re-fetch of permissions.

---

## 12. Edge Cases

- **The "Final Owner" Problem:** The system must prevent the last `Owner` from deleting themselves or downgrading their own role.
- **Role Downgrade:** When an Admin downgrades a user, the NAC must automatically check for and revoke any active Access Relationships that are no longer valid for the lower role.
- **Deleted User Content:** Admins must choose a "Successor" for a deleted user's active tasks and private files to prevent data loss.

---

## 13. Scalability Considerations

- **Virtualization:** The User Panel list must use **windowing/virtualization** to handle 1,000+ users without UI lag.
- **Log Partitioning:** Audit logs are partitioned by month in the database to maintain query performance as the log volume grows.
- **Search:** Use a full-text search engine (e.g., ElasticSearch or Postgres `tsvector`) for the Admin User Panel to allow instant filtering by name, email, or metadata.
