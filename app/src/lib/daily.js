import { writable, get } from 'svelte/store'
import { makeQuiz } from './quiz/questions.js'

const KEY = 'daily'
const DEFAULTS = { on: false, time: '09:00', streak: 0, last: '', answer: null }

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) }
  } catch {
    return { ...DEFAULTS }
  }
}

/** { on, time 'HH:MM', streak, last (day of last correct answer), answer: { day, picked } }, kept in localStorage. */
export const daily = writable(load())

export function setDaily(patch) {
  const next = { ...get(daily), ...patch }
  daily.set(next)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage blocked: settings last until the app closes
  }
}

const pad = (n) => String(n).padStart(2, '0')
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** Small seeded generator so a given day always gives the same question, however often the app is reopened. */
function seeded(str) {
  let h = 1779033703
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 3432918353)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The random-but-stable question for `day` ('YYYY-MM-DD'), or undefined if the data can't support one. */
export const dailyQuestion = (dataset, idx, goals, day) => makeQuiz(dataset, idx, goals, 1, seeded(day))[0]

/** Streak to show: it lapses if neither today nor yesterday was answered correctly. */
export function currentStreak(s, today = new Date()) {
  return s.last === dayKey(today) || s.last === dayKey(addDays(today, -1)) ? s.streak : 0
}

/** State after answering `day`'s question: one attempt per day, a correct one extends or restarts the streak. */
export function recordAnswer(s, day, picked, correct) {
  if (s.answer?.day === day) return s
  const next = { ...s, answer: { day, picked } }
  if (correct) {
    const yesterday = dayKey(addDays(new Date(day + 'T12:00'), -1))
    next.streak = s.last === yesterday ? s.streak + 1 : 1
    next.last = day
  }
  return next
}
