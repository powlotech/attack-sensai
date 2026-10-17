import { expect, test } from 'vitest'
import { compareLayers } from './compare.js'

const idx = { byId: new Map(['T1', 'T2', 'T3', 'T4', 'T5'].map((id) => [id, { id }])) }
const L = (entries) => ({ entries: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, { score: 0, comment: '', learned: false, ...v }])) })

test('classifies gap / weak / covered and extras', () => {
  const ref = L({ T1: { score: 2 }, T2: { score: 3 }, T3: { score: 1 }, T4: { score: 0, order: 1 } })
  const mine = L({ T2: { score: 1 }, T3: { score: 3 }, T5: { score: 2 } })
  const r = compareLayers(ref, mine, idx)
  expect(r.gaps.map((x) => x.id)).toEqual(['T1'])
  expect(r.weak.map((x) => x.id)).toEqual(['T2'])
  expect(r.covered.map((x) => x.id)).toEqual(['T3'])
  expect(r.extra.map((x) => x.id)).toEqual(['T5'])
  expect(r.total).toBe(3)
  expect(r.covered[0]).toMatchObject({ ref: 1, mine: 3 })
})

test('gaps sort by reference order, unordered last; platform filter and unknown ids drop rows', () => {
  const ref = L({ T1: { score: 1 }, T2: { score: 1, order: 2 }, T3: { score: 1, order: 1 }, T9: { score: 1 } })
  const r = compareLayers(ref, L({}), idx)
  expect(r.gaps.map((x) => x.id)).toEqual(['T3', 'T2', 'T1'])
  expect(compareLayers(ref, L({}), idx, new Set(['T2'])).gaps.map((x) => x.id)).toEqual(['T2'])
})
