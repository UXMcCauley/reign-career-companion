import type { Conversation } from '../data/chatTypes';
import { setAppBadge } from './notifications';

/**
 * Tiny shared store for the total number of unread chats, so the floating
 * tab bar (always mounted) can show/hide its notification dot in sync with
 * the chat screen. Muted conversations are ignored, matching the chat list
 * which hides their unread badge.
 */

const CHAT_LOCAL_KEY = 'reign_chat_v2';

type Listener = () => void;
const listeners = new Set<Listener>();
let count: number | null = null;

function unreadOf(convs: Conversation[]): number {
  return convs.reduce((n, c) => n + (!c.muted && c.unread > 0 ? c.unread : 0), 0);
}

function computeFromStorage(): number {
  try {
    const raw = localStorage.getItem(CHAT_LOCAL_KEY);
    if (!raw) return 0;
    return unreadOf(JSON.parse(raw) as Conversation[]);
  } catch {
    return 0;
  }
}

export function getChatUnreadCount(): number {
  if (count === null) count = computeFromStorage();
  return count;
}

export function setChatUnreadFromConversations(convs: Conversation[]): void {
  const next = unreadOf(convs);
  if (next === count) return;
  count = next;
  void setAppBadge(next);
  listeners.forEach(listener => listener());
}

/** Push the current unread count to the app icon badge (e.g. on app launch). */
export function syncAppBadge(): void {
  void setAppBadge(getChatUnreadCount());
}

export function subscribeChatUnread(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
