You are a senior distributed systems architect specializing in real-time event systems and notification infrastructure (similar to Slack, Trello, and modern SaaS platforms).

Your task is to generate a COMPLETE Product Requirements Document (PRD) for the NOTIFICATION SYSTEM of a SaaS collaboration platform.

This system is CRITICAL and must be treated as a CORE INFRASTRUCTURE, not a simple feature.

---

# 🎯 OBJECTIVE

Design a scalable, real-time notification system that:

- Keeps users instantly informed
- Works across web and mobile
- Avoids spam and overload
- Supports prioritization and personalization
- Integrates deeply with all system modules (tasks, chat, access, performance)

---

# 🔔 NOTIFICATION TYPES

You MUST define all notification categories:

### 1. Task Notifications

- Task assigned
- Task updated
- Task completed
- Task overdue
- Deadline approaching

---

### 2. Chat Notifications

- New message
- Mentions (@user)
- Replies in threads

---

### 3. System Notifications

- Access changes
- Role changes
- Admin actions

---

### 4. Performance Notifications

- Performance summary
- Warnings (e.g., declining success rate)

---

# ⚡ DELIVERY CHANNELS

Support multi-channel delivery:

1. In-App Notifications (real-time UI)
2. Push Notifications (mobile)
3. Email Notifications (optional but configurable)

---

# 🧠 NOTIFICATION ENGINE (CORE SYSTEM)

You MUST design:

### Event-Driven Architecture:

- Every system action emits an event
- Notification service listens to events

### Requirements:

- Event queue / message broker
- Idempotency (avoid duplicates)
- Retry logic

---

# 🎯 PRIORITY SYSTEM

Define:

- High priority (immediate delivery)
  - Mentions
  - Direct messages
  - Task assignments

- Medium priority
  - Updates

- Low priority
  - Summaries

---

# 🧩 ANTI-SPAM SYSTEM (CRITICAL)

You MUST design mechanisms to prevent overload:

### Required features:

- Notification batching
- Rate limiting
- Deduplication
- Smart grouping (e.g., "5 new updates")

---

# ⚙️ USER PREFERENCES

Each user must be able to:

- Enable/disable notification types
- Choose delivery channels per type
- Mute:
  - Specific chats
  - Specific boards

- Snooze notifications

---

# 🟢 REAL-TIME BEHAVIOR

Define:

- How in-app notifications update instantly
- Sync across devices
- Handling offline users

---

# 📱 MOBILE PUSH SYSTEM

Define:

- Push notification provider (e.g., Firebase)
- Payload structure
- Deep linking:
  - Tap → opens correct screen (task/chat)

---

# 🔗 ROUTING INTEGRATION (IMPORTANT)

Every notification must include:

- Target route
- Context data

Example:

- Task notification → /board/:boardId/task/:taskId
- Chat mention → /chat/:spaceId

---

# 📥 NOTIFICATION STATES

Each notification must support:

- Unread
- Read
- Archived (optional)

---

# 📊 NOTIFICATION CENTER (UI)

Define:

- Central inbox for notifications
- Filtering:
  - Type
  - Read/unread

- Grouping logic

---

# 🧱 DATA MODEL

Define schema for:

- Notifications
- User preferences
- Delivery logs

---

# ⚙️ API DESIGN

Define endpoints:

- Fetch notifications
- Mark as read
- Update preferences

---

# ⚡ SCALABILITY

Define:

- Handling millions of notifications
- Queue-based architecture
- Horizontal scaling

---

# 🔐 SECURITY

Define:

- Preventing data leaks
- Permission-aware notifications
- Avoid notifying unauthorized users

---

# ⚠️ EDGE CASES

You MUST handle:

- User offline
- Duplicate events
- Notification storm (e.g., bulk updates)
- User muted channel
- Deleted resource (task/chat)

---

# 📊 REQUIRED OUTPUT STRUCTURE

You MUST include:

1. Executive Summary
2. Notification Types
3. Event System Architecture
4. Notification Engine Design
5. Priority & Anti-Spam System
6. User Preferences System
7. Delivery Channels (Web + Mobile)
8. Routing Integration
9. Notification Center UI
10. Data Model (Schema)
11. API Design
12. Scalability Considerations
13. Security Considerations
14. Edge Cases

---

# ⚙️ TECH EXPECTATIONS

You MUST recommend:

- Event queue system (e.g., Kafka, RabbitMQ, or equivalent)
- Push system (e.g., Firebase)
- Real-time layer

---

# 🎯 OUTPUT STYLE

- Systems-level thinking
- No fluff
- Implementation-ready

---

Now generate the full PRD for the Notification System.
