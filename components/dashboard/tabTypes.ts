// Shared prop contract for every dashboard tab — each tab owns its own data
// fetching/state and only needs the authenticated user, a headers builder,
// and the shared alert/confirm dialog triggers from the page shell.
export interface TabProps {
  getHeaders: () => HeadersInit;
  triggerAlert: (title: string, message: string, tone?: "danger" | "success" | "info", confirmText?: string) => void;
  triggerConfirm: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean, confirmText?: string) => void;
}
