import { get } from 'svelte/store'
import { daily, dailyQuestion, dayKey, addDays } from '../daily.js'

const DAYS = 14

/** Android only: ask permission. Returns true when notifications may be shown. */
export async function allowNotifications() {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) return false
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const { display } = await LocalNotifications.requestPermissions()
  return display === 'granted'
}

/** Replace the pending reminders with one per day for the next 14 days (the text differs each day, so no repeat rule). Call on every app open. */
export async function scheduleDaily(dataset, idx, goals) {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const { pending } = await LocalNotifications.getPending()
  if (pending.length) await LocalNotifications.cancel({ notifications: pending })
  const s = get(daily)
  if (!s.on) return
  const [h, m] = s.time.split(':').map(Number)
  const now = new Date()
  const notifications = []
  for (let i = 0; i < DAYS; i++) {
    const day = addDays(now, i)
    const key = dayKey(day)
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
    if (at <= now || s.answer?.day === key) continue
    const q = dailyQuestion(dataset, idx, goals, key)
    if (q) notifications.push({ id: i + 1, title: 'Daily question', body: q.prompt, schedule: { at, allowWhileIdle: true } })
  }
  if (notifications.length) await LocalNotifications.schedule({ notifications })
}

/** Open the daily question when a reminder is tapped. */
export async function onReminderTap(go) {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.addListener('localNotificationActionPerformed', () => go())
}
