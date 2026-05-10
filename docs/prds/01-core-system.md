# Product Requirements Document (PRD): Core System Foundation

**Version:** 1.0

**Status:** Draft / For Engineering Review

**Role:** Senior PM / Software Architect

---

## 1. Executive Summary

This document defines the foundational architecture for **"Nexus,"** a high-scale SaaS collaboration platform. The core system provides the skeletal structure—routing, authentication, multi-tenancy, and real-time synchronization—upon which all functional modules (Tasks, Chat, Docs) will be built. The goal is a "Single Page App" (SPA) feel with deep-link persistence and sub-100ms perceived latency.

---

## 2. System Architecture Overview

The system follows an **API-First, Event-Driven Architecture**.

### High-Level Diagram

```text
[ Web Client (React) ]    [ Mobile Client (React Native) ]
          |                         |
          +----------+--------------+
                     |
            [ Load Balancer / Ingress ]
                     |
    +----------------+----------------+----------------+
    |                |                |                |
[ Auth Service ] [ API Gateway ] [ Real-time Gateway ] [ Media Service ]
    |                |                | (WebSockets)     |
    |          [ Microservices ]      |            [ S3 Storage ]
    |                |                |
    +-------+--------+-------+--------+
            |                |
      [ Postgres DB ]  [ Redis Cache/PubSub ]

```

---

## 3. Routing System Design (CRITICAL)

The routing system is the source of truth for the application state. It must support deep linking and nested views.

### 3.1 Route Hierarchy & Structure

Routes follow a RESTful pattern prefixed by the `workspaceId` to enforce multi-tenancy at the URL level.

| Pattern                       | Component     | Description                                        |
| ----------------------------- | ------------- | -------------------------------------------------- |
| `/:wsId/dashboard`            | DashboardView | High-level overview of the workspace.              |
| `/:wsId/board/:bId`           | BoardView     | Kanban/List view of a specific board.              |
| `/:wsId/board/:bId/task/:tId` | TaskModal     | Task details rendered as an overlay or side-panel. |
| `/:wsId/chat/:sId`            | ChatView      | Specific chat space/channel.                       |
| `/:wsId/settings/*`           | SettingsView  | Workspace and user configuration.                  |

### 3.2 Technical Requirements

- **Engine:** React Router v6+ (Data APIs) or Next.js Parallel Routes.
- **Context Preservation:** On refresh, the `wsId`, `bId`, and `tId` are parsed from the URL to hydrate the store.
- **Lazy Loading:** Route-based code splitting. The `ChatView` code is not loaded when a user is in `BoardView`.
- **Guard System:** \* `PublicRoute`: Login/Signup.
- `PrivateRoute`: Validates JWT.
- `WorkspaceRoute`: Validates user membership in `:wsId`.

---

## 4. Authentication System

A hybrid Token-based approach focusing on security and multi-device persistence.

- **Identity Provider:** Custom Auth service issuing **JWTs** (short-lived) and **Refresh Tokens** (long-lived, stored in `HttpOnly` cookies).
- **Flows:** \* Standard Email/Password with Argon2 hashing.
- Magic Link (SMTP/SES) for passwordless entry.

- **Session Management:** \* Support for "Log out from all devices."
- Redis-backed session store to track active `userId` + `deviceId` pairs.

- **Security:** Rate limiting on login attempts, CSRF protection for cookies, and mandatory TLS 1.3.

---

## 5. Navigation System

The navigation is decoupled from business logic, driven strictly by the Routing System.

- **Primary Sidebar:** Persistent across views. Contains Workspace switcher, Global Search, and high-level modules (Boards, Chats, Notifications).
- **Secondary Context Rail:** Contextual to the route. (e.g., If in `/chat`, shows the list of channels).
- **Breadcrumbs:** Automatically generated based on the route segments.
- **Stateful Sidebar:** Sidebar collapse state persists in `localStorage` per user.

---

## 6. State Management Strategy

The application utilizes a **Tri-Tier State Strategy** to balance performance and complexity.

1. **Server State (React Query / SWR):** Handles all async data fetching, caching, and revalidation. This is the primary data layer.
2. **Global UI State (Zustand):** Lightweight store for non-persisted UI states (e.g., sidebar open/closed, current theme, active modals).
3. **Local Component State (useState):** For transient data like form inputs or hover states.

---

## 7. Real-Time System Design

Collaboration requires instantaneous updates across all clients.

- **Infrastructure:** WebSockets via **Socket.io** or **AWS AppSync (GraphQL Subscriptions)**.
- **Event Bus:** Redis Pub/Sub backend. When a task is updated in Service A, an event is pushed to Redis, picked up by the WebSocket server, and broadcast to clients in the specific `workspace_room`.
- **Concurrency Handling:** \* **Optimistic UI Updates:** UI updates immediately; rolls back if the server returns an error.
- **Last-Write-Wins (LWW):** Standard for task metadata.
- **Operational Transformation (OT) or CRDT:** Reserved for real-time document/description editing.

---

## 8. Multi-Tenant Architecture

Nexus is a "Siloed Data, Shared App" model.

- **Data Isolation:** Every table in the RDBMS contains a `workspace_id` column. All queries _must_ include this ID in the `WHERE` clause (enforced at the Repository/ORM level or via Row Level Security (RLS)).
- **Workspace Entity:** \* `id`, `slug`, `name`, `owner_id`.
- **Role-Based Access Control (RBAC):**
- **Owner:** Full billing and workspace control.
- **Admin:** User management and board creation.
- **Member:** Standard read/write within assigned projects.
- **Guest:** Restricted access to specific boards/chats.

---

## 9. Mobile vs. Web Strategy

- **Web:** High-density UI, keyboard shortcuts, drag-and-drop focus.
- **Mobile:** Gesture-driven (swiping to close chats), simplified views, push-notification heavy.
- **Shared Logic:** 80% of the "Core Logic" (Auth flows, API client, State management) is housed in a shared **Monorepo package** (`@nexus/core`) used by both React and React Native.

---

## 10. Data Layer & Persistence

- **Caching:** Redis for API response caching and session data.
- **Offline Support (Mobile):** SQLite (via Expo/React Native) stores a subset of recent data. The app remains functional in "Read Only" mode during outages.
- **Sync:** A "Pending Action Queue" in local storage tracks offline writes and syncs them once heartbeats resume.

---

## 11. Error Handling & Resilience

- **Global Boundary:** React Error Boundaries to prevent total app crashes.
- **Network Resilience:** Exponential backoff for WebSocket reconnections and API retries.
- **UI Fallbacks:** Skeleton screens for loading; Toast notifications for non-blocking errors.

---

## 12. Tech Stack Recommendations

| Layer                | Technology                                       |
| -------------------- | ------------------------------------------------ |
| **Frontend (Web)**   | React + Vite + TailwindCSS                       |
| **Mobile**           | React Native (Expo)                              |
| **Backend**          | Node.js (NestJS) - TypeScript                    |
| **Database**         | PostgreSQL (Primary) + Redis (Cache)             |
| **Real-time**        | Socket.io + Redis Pub/Sub                        |
| **State Management** | TanStack Query (Server) + Zustand (UI)           |
| **Auth**             | NextAuth.js or custom Passport.js implementation |
| **Infrastructure**   | AWS (EKS for compute, RDS for DB)                |

---

## 13. Scalability & Security Considerations

- **Horizontal Scaling:** The API and WebSocket layers are stateless and can scale via K8s HPA (Horizontal Pod Autoscaler).
- **Database Scaling:** Read replicas for heavy fetch operations (Dashboards/Reports).
- **Security:** All API endpoints are protected by JWT middleware. Sanitize all user input to prevent XSS in chat/task descriptions.
