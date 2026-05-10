export const APP_NAME = "Nexus";

export const ROUTES = {
  dashboard: "/dashboard",
  boards: "/boards",
  board: (boardId: string) => `/boards/${boardId}`,
  task: (boardId: string, taskId: string) => `/boards/${boardId}/tasks/${taskId}`,
  chat: "/chat",
  chatRoom: (chatId: string) => `/chat/${chatId}`,
  adminUsers: "/admin/users",
  adminUser: (userId: string) => `/admin/users/${userId}`,
  schedule: "/schedule",
  notifications: "/notifications",
} as const;
