import type { FaultTarget, LogEntry, LogLevel } from '@electrasim/domain';

export interface NotificationInput {
  id?: number;
  message: string;
  type: LogLevel;
  target?: FaultTarget;
  showUndo?: boolean;
  reviewCircuit?: boolean;
  progress?: boolean;
  /** Stable event identity, e.g. one solver finding for one circuit revision. */
  key?: string;
}
export interface UiNotification extends NotificationInput {
  id: number;
  key: string;
  createdAt: number;
  remainingMs: number;
  expiresAt: number | null;
  pauseReasons: ('hover' | 'focus')[];
}
export interface NotificationState {
  notifications: UiNotification[];
  notificationHistory: { key: string; id: number; at: number }[];
  logs: LogEntry[];
  /** Compatibility projection for callers of showUndoToast/showNoticeToast. */
  undoToast: { message: string; id: number; showUndo?: boolean } | null;
}
let nextId = 0;
export const NOTIFICATION_DURATION_MS = 5000;

/** One event feeds both surfaces. This reducer never changes the circuit. */
export function publishNotification(state: NotificationState, input: NotificationInput): number {
  const now = Date.now();
  const key =
    input.key ??
    `${input.type}:${input.message.trim().replace(/[.!]+$/, '')}:${JSON.stringify(input.target ?? null)}`;
  const previous = state.notificationHistory.find((event) => event.key === key);
  const active = state.notifications.find((event) => event.id === (input.id ?? previous?.id));
  const duplicate =
    input.id === undefined && previous && (input.key !== undefined || now - previous.at < 1000);
  if (duplicate && !input.showUndo && !input.progress) return previous.id;
  const id =
    input.id ?? (duplicate && active && (input.showUndo || active.progress) ? active.id : ++nextId);
  const notification: UiNotification = {
    ...input,
    id,
    key,
    createdAt: now,
    remainingMs: NOTIFICATION_DURATION_MS,
    expiresAt: input.progress ? null : now + NOTIFICATION_DURATION_MS,
    pauseReasons: [],
  };
  // One current Undo opportunity is retained independently of ordinary notices.
  if (input.showUndo)
    state.notifications = state.notifications.filter((n) => !n.showUndo || n.id === id);
  state.notifications = [...state.notifications.filter((n) => n.id !== id), notification];
  const ordinary = state.notifications.filter((n) => !n.showUndo && !n.progress);
  const evicted = new Set(ordinary.slice(0, Math.max(0, ordinary.length - 3)).map((n) => n.id));
  state.notifications = state.notifications.filter((n) => !evicted.has(n.id));
  const log = {
    id: `log-${id}`,
    message: input.message,
    type: input.type,
    ...(input.target ? { target: input.target } : {}),
  };
  const logIndex = state.logs.findIndex((entry) => entry.id === log.id);
  if (logIndex >= 0) state.logs[logIndex] = log;
  else state.logs.unshift(log);
  state.logs.length = Math.min(state.logs.length, 100);
  state.notificationHistory = [
    { key, id, at: now },
    ...state.notificationHistory.filter((event) => event.key !== key),
  ].slice(0, 100);
  state.undoToast = { id, message: input.message, showUndo: input.showUndo ?? false };
  return id;
}
