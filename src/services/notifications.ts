// Local notifications for new episodes (native only; no-op in the browser).
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { Reminder } from '../utils/reminders'

export const remindersSupported = (): boolean => Capacitor.isNativePlatform()

/** Asks for notification permission if needed; true when granted. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!remindersSupported()) return false
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return true
  const result = await LocalNotifications.requestPermissions()
  return result.display === 'granted'
}

/**
 * Replaces all pending notifications with `reminders` (at most 60, so a full
 * reschedule is cheap and picks up moved air dates). This app schedules nothing else.
 */
export async function syncReminders(reminders: Reminder[]): Promise<void> {
  if (!remindersSupported()) return
  const { notifications: pending } = await LocalNotifications.getPending()
  if (pending.length > 0) {
    await LocalNotifications.cancel({
      notifications: pending.map((n) => ({ id: n.id })),
    })
  }
  if (reminders.length === 0) return

  const permission = await LocalNotifications.checkPermissions()
  if (permission.display !== 'granted') return
  await LocalNotifications.schedule({
    notifications: reminders.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      schedule: { at: r.at },
      // A reminder can be a few minutes late; exact alarms would need an extra
      // Android permission (and the plugin blocks on a settings screen without it)
      isExactNotification: false,
      extra: { seriesId: r.seriesId },
    })),
  })
}
