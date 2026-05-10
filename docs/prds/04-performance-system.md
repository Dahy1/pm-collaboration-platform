# Product Requirements Document (PRD): Performance & Productivity Tracking System

**Version:** 1.3

**Status:** Implementation Ready

**Reference:** Extends Nexus Core v1.0, Kanban v1.1, and Access Control v1.2

---

## 1. Executive Summary

The **Nexus Performance Engine (NPE)** is designed to provide an objective, ungameable metric of user productivity. While standard tools measure completion, NPE measures **reliability**. By implementing a dynamic penalty model for overdue tasks, we eliminate the "ostrich effect" where users ignore failing tasks to preserve their metrics. This system provides the data layer for management reviews and high-trust team environments.

---

## 2. Performance System Overview

The system tracks every task assigned to a user and calculates a **Performance Score ($P$)** within a **30-day rolling window**. Unlike a simple percentage, $P$ is a weighted aggregate that accounts for the severity of delays.

---

## 3. Success Rate & Penalty Models

### 3.1 Basic vs. Enhanced Success Rate

- **Basic:** $S = \frac{\text{Completed On Time}}{\text{Total Assigned}}$ (Flaw: Ignores the magnitude of lateness).
- **Nexus Enhanced:** A score-based approach where every task has a "Potential Value" of **1.0**.

### 3.2 Penalty Model Options

#### Model A: Linear Penalty

Penalty increases by a fixed constant $k$ for every unit of time $t$ past the deadline.

- **Formula:** $Score(t) = 1.0 - (k \times t)$
- **Pros:** Easy for users to calculate.
- **Cons:** Does not create enough urgency for long-term overdue tasks.

#### Model B: Exponential Decay

The value of a task drops sharply immediately after a deadline, then plateaus.

- **Formula:** $Score(t) = e^{-\lambda t}$
- **Pros:** Highly punishes any lateness.
- **Cons:** Discourages users from finishing tasks that are "already dead" (e.g., 2 weeks late).

#### Model C: Time-Weighted Decay with Negative Floor (Final Selection)

This model allows for partial credit but transitions into a **negative penalty** if the task is ignored, actively lowering the user's total average.

---

## 4. Final Model Selection: The "Nexus Reliability Score"

**Selected Model:** Time-Weighted Decay with Floor.

### 4.1 The Formula

For a single task $i$, the score $s_i$ is calculated as:

$$
s_i = \begin{cases}
1.0 & \text{if } t_{comp} \le t_{dl} \
\max(0.5, 1.0 - 0.1 \times \Delta t_{days}) & \text{if task is completed } LATE \
-0.2 \times \min(5, \Delta t_{days}) & \text{if task is OVERDUE (uncompleted)}
\end{cases}
$$

**Where:**

- $\Delta t_{days}$ = Days past deadline.
- **On-Time:** Full credit (1.0).
- **Late:** Minimum 0.5 credit (to encourage completion).
- **Overdue:** Penalty grows to **-1.0** (equivalent to "un-completing" an on-time task).

### 4.2 Justification

This model is **Resistant to Gaming**: Ignoring a task is twice as damaging as finishing it late. It encourages users to negotiate deadlines _before_ they expire or finish them as soon as possible once they do.

---

## 5. Task Classification System

| Status                | Condition                              | Impact on Score              |
| --------------------- | -------------------------------------- | ---------------------------- |
| **Completed On Time** | `completedAt <= deadlineAt`            | +1.0                         |
| **Completed Late**    | `completedAt > deadlineAt`             | +0.5 to +0.9                 |
| **Overdue**           | `now > deadlineAt` AND `!isCompleted`  | -0.1 to -1.0 (Dynamic)       |
| **Active**            | `now <= deadlineAt` AND `!isCompleted` | Neutral (Not in denominator) |

---

## 6. Multi-Assignee & Changes

- **Multi-Assignee:** Points are split equally. If a task is worth 1.0, and there are 2 assignees, each receives a 0.5 weight in their individual rolling window.
- **Deadline Changes:** \* Changes made **before** the original deadline: No penalty.
- Changes made **after** the original deadline: The task is flagged as "Rescheduled" and its maximum possible score is capped at **0.8**.

- **Reassignment:** If User A reassigns an **Overdue** task to User B, User A retains the penalty accrued up to that moment as a permanent "Historical Negative" for that window.

---

## 7. Anti-Gaming Mechanisms

1. **The "Instant Completion" Check:** Tasks created and completed in $< 5$ minutes are flagged for audit (prevents padding stats with fake tasks).
2. **Deadline Freeze:** Users with "Editor" roles cannot change a deadline once it is $< 24$ hours away without "Admin" approval.
3. **The Overdue Cap:** A user cannot have more than 10% of their score derived from "Active" tasks to prevent "diluting" the denominator with easy, future tasks.

---

## 8. User Dashboard Design

The dashboard focuses on the **Rolling 30-Day Trend**.

- **Primary Metric:** Large Radial Gauge showing "Reliability Score %".
- **The "Drain" List:** List of Overdue tasks currently pulling the score down, showing "Points lost per day."
- **Success Breakdown:** Stacked Bar Chart (On-Time vs. Late vs. Overdue).
- **Heatmap:** Visualizing days of the week where deadlines are most frequently missed.

---

## 9. Data Model (Schema)

```sql
CREATE TABLE task_performance_snapshots (
    task_id UUID REFERENCES tasks(id),
    user_id UUID REFERENCES users(id),
    snapshot_date DATE,
    current_score DECIMAL(4,2), -- The calculated s_i
    status task_status_enum,
    days_past_deadline INT DEFAULT 0,
    PRIMARY KEY (task_id, user_id, snapshot_date)
);

CREATE TABLE user_performance_aggregates (
    user_id UUID PRIMARY KEY,
    rolling_30d_score DECIMAL(5,2),
    on_time_count INT,
    late_count INT,
    overdue_count INT,
    last_calculated TIMESTAMP
);

```

---

## 10. API Design

| Endpoint                     | Method | Description                                              |
| ---------------------------- | ------ | -------------------------------------------------------- |
| `/performance/me`            | `GET`  | Returns current user's score and trend.                  |
| `/performance/team/:teamId`  | `GET`  | Aggregated team reliability metrics.                     |
| `/performance/recalculate`   | `POST` | (Internal/Admin) Force refresh of penalty logic.         |
| `/performance/audit/:taskId` | `GET`  | Detailed log of how a specific task's score was derived. |

---

## 11. Scalability Considerations

- **Batch Processing:** Penalties are recalculated globally via a **Cron Job** at 00:00 UTC daily.
- **Real-Time Hooks:** Completion events trigger an immediate recalculation for the specific user's `rolling_30d_score`.
- **Data Retention:** Snapshots older than 90 days are moved to cold storage (S3/BigQuery) for long-term trend analysis, keeping the production `performance` table lean.

---

## 12. Edge Cases

- **Tasks without Deadlines:** These are excluded from the Reliability Score. They are tracked under a separate "Volume" metric.
- **Deleted Tasks:** If an overdue task is deleted, the penalty accrued remains in the user's 30-day window to prevent "Deleting the evidence."
- **Retroactive Edits:** If an Admin changes a completion date, the `task_performance_snapshot` is re-generated, and the aggregate score is updated in the next batch cycle.
