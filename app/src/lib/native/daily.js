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
  if (!notifications.length) return
  const r = await LocalNotifications.schedule({ notifications })
  return r.warning?.message ?? `${notifications.length} reminders scheduled`
}

/** Fire one reminder in 15 seconds so you can check notifications work on this device. */
export async function testReminder() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const r = await LocalNotifications.schedule({
    notifications: [{ id: 99, title: 'Daily question', body: 'Test reminder', schedule: { at: new Date(Date.now() + 15000), allowWhileIdle: true } }],
  })
  return r.warning?.message ?? 'Test reminder in 15 seconds'
}

/** Open the daily question when a reminder is tapped. */
export async function onReminderTap(go) {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.addListener('localNotificationActionPerformed', () => go())
}

/** What the phone has pending, e.g. "3 pending, next 2026-10-18 10:20". Empty in a browser. */
export async function pendingSummary() {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) return ''
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const { notifications } = await LocalNotifications.getPending()
  const ats = notifications.map((n) => n.schedule?.at).filter(Boolean).map((a) => new Date(a)).sort((a, b) => a - b)
  if (!notifications.length) return 'No reminders pending'
  return `${notifications.length} pending${ats.length ? `, next ${ats[0].toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : ''}`
}
