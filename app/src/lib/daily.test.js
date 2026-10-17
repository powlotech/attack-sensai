import { describe, it, expect } from 'vitest'
import { dayKey, addDays, currentStreak, recordAnswer, dailyQuestion } from './daily.js'

const base = { streak: 0, last: '', answer: null }

describe('daily', () => {
  it('extends the streak on consecutive days and restarts after a gap', () => {
    let s = recordAnswer(base, '2026-10-01', 'a', true)
    s = recordAnswer(s, '2026-10-02', 'a', true)
    expect(s.streak).toBe(2)
    expect(recordAnswer(s, '2026-10-05', 'a', true).streak).toBe(1)
  })
  it('allows one attempt per day and a wrong answer does not count', () => {
    const s = recordAnswer(base, '2026-10-01', 'x', false)
    expect(s.streak).toBe(0)
    expect(recordAnswer(s, '2026-10-01', 'y', true)).toBe(s)
  })
  it('shows the streak only while it is alive', () => {
    const s = { streak: 3, last: '2026-10-01' }
    expect(currentStreak(s, new Date(2026, 9, 2))).toBe(3)
    expect(currentStreak(s, new Date(2026, 9, 3))).toBe(0)
  })
  it('gives the same question for the same day', () => {
    const d = { tactics: [1, 2, 3, 4, 5].map((i) => ({ name: 'T' + i, shortname: 't' + i, description: 'Goal ' + i + '.' })), techniques: [], groups: [] }
    const a = dailyQuestion(d, {}, {}, '2026-10-01')
    expect(a).toEqual(dailyQuestion(d, {}, {}, '2026-10-01'))
    expect(dayKey(addDays(new Date(2026, 9, 31), 1))).toBe('2026-11-01')
  })
})
