import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Lightweight notification helper for the chat mockup.
 *
 * On a native build this schedules a real on-device LOCAL notification
 * (banner + lock screen), which is the only kind of notification a
 * self-contained demo can deliver without an APNs certificate and a
 * backend push server. In the browser it falls back to the Web
 * Notification API so the feature is still demonstrable during `npm run dev`.
 */

type TapHandler = (conversationId: string) => void;

let permissionState: boolean | null = null;
let nativeListenerBound = false;
let tapHandler: TapHandler | null = null;
let nextId = Date.now() % 100000;

const isNative = Capacitor.isNativePlatform();

/** Register a callback fired when the user taps a chat notification. */
export function onNotificationTap(handler: TapHandler): void {
  tapHandler = handler;
  if (isNative && !nativeListenerBound) {
    nativeListenerBound = true;
    void LocalNotifications.addListener('localNotificationActionPerformed', event => {
      const conversationId = event.notification.extra?.conversationId as string | undefined;
      if (conversationId) tapHandler?.(conversationId);
    });
  }
}

/** Ask for notification permission once, caching the result. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionState !== null) return permissionState;

  if (isNative) {
    const current = await LocalNotifications.checkPermissions();
    let display = current.display;
    if (display === 'prompt' || display === 'prompt-with-rationale') {
      display = (await LocalNotifications.requestPermissions()).display;
    }
    permissionState = display === 'granted';
    return permissionState;
  }

  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      permissionState = true;
    } else if (Notification.permission !== 'denied') {
      permissionState = (await Notification.requestPermission()) === 'granted';
    } else {
      permissionState = false;
    }
    return permissionState;
  }

  permissionState = false;
  return permissionState;
}

export interface IncomingMessageNotification {
  conversationId: string;
  title: string;
  body: string;
  /** Delay before the notification fires; lets the user background the app to see it. */
  delayMs?: number;
}

/** Fire a notification representing an incoming chat message. */
export async function notifyIncomingMessage({
  conversationId,
  title,
  body,
  delayMs = 0,
}: IncomingMessageNotification): Promise<void> {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  if (isNative) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: nextId++,
          title,
          body,
          schedule: delayMs > 0 ? { at: new Date(Date.now() + delayMs) } : undefined,
          threadIdentifier: conversationId,
          extra: { conversationId },
        },
      ],
    });
    return;
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    const show = () => {
      const notification = new Notification(title, { body, tag: conversationId });
      notification.onclick = () => {
        window.focus();
        tapHandler?.(conversationId);
        notification.close();
      };
    };
    if (delayMs > 0) window.setTimeout(show, delayMs);
    else show();
  }
}
