import { expect, test } from 'vitest'
import { timelineOf } from './timeline.js'

const byId = new Map(['T1', 'T2', 'T3', 'T4'].map((id) => [id, { id, name: id }]))
const idx = { byId }

test('numbered steps come first in order, then entries with only a time, by id; others are left out', () => {
  const layer = { entries: {
    T3: { score: 0, comment: '', learned: false, order: 2 },
    T1: { score: 1, comment: '', learned: false, order: 1, when: 'day 1' },
    T4: { score: 2, comment: '', learned: false, when: 'later' },
    T2: { score: 3, comment: 'no step', learned: false },
    GONE: { score: 0, comment: '', learned: false, order: 9 },
  } }
  expect(timelineOf(layer, idx).map((r) => r.tech.id)).toEqual(['T1', 'T3', 'T4'])
  expect(timelineOf(layer, idx)[0].entry.when).toBe('day 1')
  expect(timelineOf(null, idx)).toEqual([])
})
test('equal steps keep a stable id order', () => {
  const layer = { entries: { T2: { order: 1 }, T1: { order: 1 } } }
  expect(timelineOf(layer, idx).map((r) => r.tech.id)).toEqual(['T1', 'T2'])
})
