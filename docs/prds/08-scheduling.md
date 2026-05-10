# Product Requirements Document (PRD): Scheduling & Availability System

**Version:** 1.7

**Status:** Implementation Ready

**Reference:** Extends Nexus Core v1.0, Access Control v1.2 (NARE), and Task System v1.1

---

## 1. Executive Summary

The **Nexus Scheduling System (NSS)** provides the temporal layer of the platform. Beyond a standard calendar, the NSS acts as a resource-allocation engine that informs the Task and Chat systems of a user's bandwidth. By integrating directly with the **NARE (Access Control)** system, it ensures that visibility is granted strictly through directional relationships, facilitating seamless coordination while maintaining individual privacy.

---

## 2. Scheduling System Overview

The NSS is built on a **Layered Availability Logic**:

1. **Base Layer:** Recurring weekly working hours (e.g., Mon-Fri, 09:00–17:00).
2. **Event Layer:** Specific "Busy" or "OOO" blocks that override the base layer.
3. **Task Layer:** Deadlines mapped against availability to identify "Impossible Deadlines."

---

## 3. User Availability Model

Users manage their time via three primary constructs:

### 3.1 Recurring Availability

- **Definition:** A template for a standard work week.
- **Storage:** RFC 5545 (iCalendar) `RRULE` strings.
- **Logic:** "Every Monday–Friday from 09:00 to 17:00 UTC."

### 3.2 Custom Time Blocks (Events)

- **Types:**
- **Busy:** Internal meetings or focus time.
- **Out of Office (OOO):** Full unavailability; triggers "Offline" status.
- **Focus Time:** Soft-busy; blocks chat notifications but allows task assignment.

- **Overrides:** Single-day changes that supersede recurring rules (e.g., "Working late this Tuesday").

---

## 4. Access-Based Visibility (NARE Integration)

Schedule visibility is strictly directional, parsed via the **NARE** engine.

| Relationship Type   | Visibility Level | Description                                                      |
| ------------------- | ---------------- | ---------------------------------------------------------------- |
| **No Relationship** | None             | User is invisible/no schedule data returned.                     |
| **Collaborator**    | Free/Busy Only   | Can see "Busy" blocks but not event titles/details.              |
| **Managed By**      | Full Details     | Can see event titles, descriptions, and specific task deadlines. |
| **Admin / Owner**   | Full + Editable  | Can manually add "OOO" or "Busy" blocks for the user.            |

---

## 5. Task Integration (The "Conflict Resolver")

NSS transforms task assignment from a blind action into an informed decision.

- **Assignee Bandwidth Check:** When selecting an assignee for a task, the UI displays a "Schedule Health" indicator based on the task's `deadlineAt`.
- **Conflict Alerts:**
- **Hard Conflict:** Task deadline falls within an "OOO" block.
- **Soft Conflict:** Task deadline is within 2 hours of a "Busy" block or outside "Working Hours."

- **Auto-Suggestion:** (Optional) If a conflict is detected, the system suggests the nearest available slot within working hours.

---

## 6. Team Coordination Features

- **Multi-User Overlay:** Admins or PMs can select up to 10 users to view an aggregated "Heatmap" of availability.
- **Common Slot Finder:** A tool that identifies overlapping "Available" blocks across a selected group of users for meeting planning.
- **Timezone Normalization:** All schedules are stored in **UTC** and dynamically translated to the viewer's local timezone.

---

## 7. Status Integration

The NSS informs the **Core Presence System**:

- **Outside Working Hours:** Auto-update status to `Offline`.
- **During OOO Block:** Auto-update status to `Offline (Returning [Date])`.
- **During Busy Block:** Auto-update status to `In a Meeting` (optional toggle).

---

## 8. Data Model (Schema)

```sql
CREATE TABLE availability_rules (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    rrule_text TEXT, -- iCal standard
    start_time TIME,
    end_time TIME,
    timezone VARCHAR(50) DEFAULT 'UTC'
);

CREATE TABLE schedule_events (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event_type ENUM('BUSY', 'OOO', 'FOCUS'),
    title VARCHAR(100),
    description TEXT,
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    is_recurring BOOLEAN DEFAULT false
);

```

---

## 9. API Design

| Method | Endpoint                   | Description                                                   |
| ------ | -------------------------- | ------------------------------------------------------------- |
| `GET`  | `/schedule/:userId`        | Fetch availability for a specific user (Permissions applied). |
| `POST` | `/schedule/events`         | Create a new Busy/OOO block.                                  |
| `GET`  | `/schedule/check-conflict` | `?userId=id&deadline=iso_date` -> Returns conflict status.    |
| `PUT`  | `/schedule/working-hours`  | Update recurring availability template.                       |

---

## 10. Mobile Considerations

- **Calendar Sync:** One-way export via **iCal URL** so users can see their Nexus schedule in Apple/Google Calendar.
- **Quick-Edit:** "Swipe to Clear" functionality for quickly marking focus time as "Free" from a mobile notification.
- **Timezone Auto-Update:** Mobile app detects device timezone changes and prompts the user to update their "Base Timezone" if a permanent move is detected.

---

## 11. Edge Cases

- **Zero Availability:** If a user has no rules defined, the system assumes a global "Available" state (00:00–23:59) but flags it in the Admin Panel for setup.
- **Access Revocation:** If A’s access to B is revoked while A is viewing B’s schedule, the next heartbeat/refresh will return a `403 Forbidden` and wipe the local cache.
- **Daylight Savings:** Handled by storing rules in UTC and using a timezone-aware library (e.g., `date-fns-tz`) for rendering.
- **Overlapping Events:** "OOO" always takes precedence over "Busy," and "Busy" takes precedence over "Available."

---

## 12. Scalability Considerations

- **Interval Trees:** Use an **Interval Tree** data structure in the application layer to perform $O(\log n + k)$ conflict checks across thousands of time blocks.
- **Caching:** Availability for the current week is cached in Redis to prevent heavy RRule parsing on every page load.
- **Batch Queries:** The "Common Slot Finder" uses a bitmask approach to represent availability in 15-minute increments for rapid logical `AND` operations across multiple users.
