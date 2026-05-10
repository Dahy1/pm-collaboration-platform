# Product Requirements Document (PRD): Chat & Communication System

**Version:** 1.4

**Status:** Implementation Ready

**Reference:** Extends Nexus Core v1.0, Kanban v1.1, and Access Control v1.2 (NARE)

---

## 1. Executive Summary

The **Nexus Communication Engine (NCE)** is a high-concurrency, real-time messaging layer. It is designed to bridge the gap between structured project management (Boards) and unstructured collaboration (Chat). The system prioritizes deep integration with the **Access Control System (NARE)** to ensure that organizational boundaries and communication blocks are strictly enforced in real-time.

---

## 2. Chat Types Architecture

The system supports three distinct communication primitives:

| Type                    | Capacity    | Privacy        | Description                                              |
| ----------------------- | ----------- | -------------- | -------------------------------------------------------- |
| **Direct Message (DM)** | 2 Users     | Private        | 1-to-1 persistent chat.                                  |
| **Group Chat**          | Up to 100   | Private        | Ad-hoc multi-user chat; user-managed membership.         |
| **Space (Channel)**     | Up to 5,000 | Public/Private | Persistent rooms, often mapped to Boards or Departments. |

---

## 3. Board ↔ Chat Linking Logic

Spaces can be "Board-Linked" to centralize project communication.

- **Auto-Synchronization:** When a Space is linked to a Board, membership is driven by the Board’s member list.
- **Join Logic:** Joining a Board automatically grants "Member" status in the linked Space.
- **Leave/Removal Logic:** If a user is removed from a Board, the system triggers an `ACCESS_REVOKED` event. The user is immediately kicked from the Space and the WebSocket connection for that room is severed.
- **Orphaned Spaces:** If a Board is deleted, the Space can either be archived or converted into a "Standalone Space" based on Admin selection.

---

## 4. Membership & Access Rules

NCE leverages the **NARE (Nexus Access & Relationship Engine)** for all interactions.

- **The "Can-Interact" Check:** Before initiating a DM or Group Chat, the system queries NARE: `Can A initiate chat with B?`.
- **Space Access:** \* **Public Spaces:** Searchable by anyone in the Workspace.
- **Private Spaces:** Invitation only; requires `SPACE_MANAGE` permission.

- **Global Blocks:** If Admin enforces a block between A and B, they are prevented from joining the same Group Chat. If already in a shared Space, NCE implements **"Message Ghosting"** (User A's messages are filtered out of User B's socket stream).

---

## 5. Message System Design

### 5.1 Components

- **Rich Text:** Support for Markdown and code snippets.
- **Mentions:** `@user` triggers a notification. `@all` restricted to Space Admins.
- **Reactions:** Atomic emoji reactions stored as a count-map per message.
- **Delivery States:**

1. **Sent:** Saved to DB.
2. **Delivered:** Received by the recipient's active client (Ack received).
3. **Seen:** Message entered the viewport of the recipient.

### 5.2 Threading Model

- **Structure:** Parent-Child hierarchy. Every message has an optional `parent_id`.
- **Behavior:** Replying to a message creates a thread. Threads do not nest deeper than one level (Flat Threads) to maintain mobile usability.

---

## 6. Real-Time Architecture

Built on **WebSockets (Socket.io)** with a **Redis Pub/Sub** backplane.

- **Presence Tracking:** Heartbeat sent every 30 seconds.
- `Active`: Socket connected.
- `Away`: No mouse/keyboard activity for 5 minutes.
- `Offline`: Socket disconnected > 60 seconds.

- **Message Ordering:** Every message is assigned a monotonically increasing **Global Sequence Number** per chat room to prevent race conditions in message rendering.

---

## 7. Admin Visibility & Privacy Model

- **Privacy First:** Admins cannot read DMs or Private Spaces by default.
- **Audit Mode:** For compliance, an "Owner" can enable "Audit Logging," which generates a decrypted log of messages for legal review. This action is logged in the **Global Audit Trail** and cannot be hidden.
- **Enforcement:** Admins can "Freeze" a Space (read-only mode) or "Nuke" (hard-delete) messages that violate policy.

---

## 8. Chat Restriction System (Integration with NARE)

NCE must handle active blocks between users:

- **DMs:** If A blocks B, the DM channel is "Closed." Existing history is preserved but the input is disabled.
- **Spaces:** Users A and B can remain in a large Space (e.g., #General), but:

1. User A cannot "Mention" User B.
2. The UI provides a "Hidden Content" toggle for messages from blocked users.

---

## 9. Data Model (Schema)

```sql
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY,
    type ENUM('DM', 'GROUP', 'SPACE'),
    board_id UUID REFERENCES boards(id) NULL,
    metadata JSONB -- Name, Icon, Description
);

CREATE TABLE chat_participants (
    room_id UUID REFERENCES chat_rooms(id),
    user_id UUID REFERENCES users(id),
    joined_at TIMESTAMP,
    role ENUM('MEMBER', 'ADMIN'),
    last_read_message_id UUID,
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    room_id UUID REFERENCES chat_rooms(id),
    sender_id UUID REFERENCES users(id),
    parent_id UUID REFERENCES messages(id) NULL, -- For Threading
    content TEXT,
    attachments JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

```

---

## 10. API Design

| Endpoint                   | Method  | Description                                         |
| -------------------------- | ------- | --------------------------------------------------- |
| `/chat/rooms`              | `GET`   | List all rooms the user is a member of.             |
| `/chat/rooms/:id/messages` | `GET`   | Fetch paginated message history.                    |
| `/chat/messages`           | `POST`  | Send a new message.                                 |
| `/chat/messages/:id/react` | `POST`  | Add/Remove emoji reaction.                          |
| `/chat/presence/update`    | `PATCH` | Update user's manual status (e.g., "In a meeting"). |

---

## 11. Mobile & Scalability Considerations

- **Mobile:** Use **FCM (Firebase Cloud Messaging)** for push. When a message is sent, NCE checks if the user is `Offline` or `Away` before triggering a push notification to avoid spam.
- **Pagination:** Use **Cursor-based pagination** (based on `created_at` and `id`) for message history to handle high-frequency scrolling.
- **Sharding:** Chat messages are sharded by `room_id` in the database to ensure that a single viral Space doesn't lock the entire `messages` table.

---

## 12. Edge Cases

- **Message Spam:** Rate limiting (e.g., max 5 messages per second per user) at the WebSocket Gateway.
- **User Removed while Typing:** `is_typing` state must be cleared immediately upon `ACCESS_REVOKED` event.
- **Large Spaces:** For Spaces with >1,000 users, "Read Receipts" and "Presence" are debounced or disabled to save bandwidth.
- **Offline Sync:** Mobile clients store a `LastSyncTimestamp`. Upon reconnecting, they fetch all messages from `LastSyncTimestamp` to `Now`.

---

## 13. Notification Hooks

NCE triggers the following to the **Notification System**:

1. `NEW_DM`: Instant push/ping.
2. `USER_MENTION`: Instant push/ping.
3. `THREAD_REPLY`: Notifies participants of that specific thread only.
4. `SPACE_ANNOUNCEMENT`: Notify all members (if enabled).
