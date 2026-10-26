export type NotifyPermission = NotificationPermission | 'unsupported';

export function notificationPermission(): NotifyPermission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

/** Ask only from a user gesture (starting a timer, or the Settings button). */
export async function requestNotifications(): Promise<NotifyPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Shows a notification through the service worker (required on Android and in installed iOS apps).
 * Browsers suspend background pages, so this only fires while Anchor is still alive in the
 * background; without a push server there is no way to wake a closed web app.
 */
export async function showNotification(title: string, body: string, tag: string): Promise<void> {
  if (notificationPermission() !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
    else new Notification(title, { body, tag });
  } catch {
    // Notifications are a nice-to-have; the in-app timer still completes.
  }
}
