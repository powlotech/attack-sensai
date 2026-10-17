import { expect, test } from 'vitest'
import { makeQuiz } from './questions.js'
import { indexDataset } from '../data/indexDataset.js'

const tactics = ['a', 'b', 'c', 'd', 'e'].map((s, i) => ({ id: 'TA' + i, shortname: s, name: s.toUpperCase(), description: `Goal ${s}. More.` }))
const techniques = ['T1', 'T2', 'T3', 'T4'].map((id, i) => ({ id, name: 'Tech' + id, isSub: false, tactics: [tactics[i].shortname] }))
const groups = ['G1', 'G2', 'G3', 'G4'].map((n, i) => ({ id: 'G' + i, name: n, techniques: [techniques[i].id] }))
const d = { tactics, techniques, groups, software: [] }

test('every question has 4 unique options including exactly the answer once', () => {
  const qs = makeQuiz(d, indexDataset(d), {}, 10)
  expect(qs.length).toBeGreaterThan(3)
  for (const q of qs) {
    expect(q.options).toHaveLength(4)
    expect(new Set(q.options).size).toBe(4)
    expect(q.options.filter((o) => o === q.answer)).toHaveLength(1)
  }
})

test('group questions only name a real user as the answer', () => {
  const idx = indexDataset(d)
  for (const q of makeQuiz(d, idx, {}, 20).filter((q) => q.prompt.startsWith('Which group'))) {
    expect(idx.usedBy.get(q.techId).groups.map((g) => g.name)).toContain(q.answer)
  }
})

test('tiny datasets yield fewer questions instead of hanging', () => {
  const tiny = { tactics: tactics.slice(0, 2), techniques: [], groups: [], software: [] }
  expect(makeQuiz(tiny, indexDataset(tiny))).toEqual([])
})

test('campaign questions only name real answers', () => {
  const campaigns = ['C1', 'C2', 'C3', 'C4'].map((n, i) => ({ id: n, name: 'Camp' + n, groups: [groups[i].id], techniques: [techniques[i].id] }))
  const dc = { ...d, campaigns }
  const idx = indexDataset(dc)
  const qs = makeQuiz(dc, idx, {}, 60)
  const gq = qs.filter((q) => q.prompt.startsWith('Which group ran'))
  const cq = qs.filter((q) => q.prompt.startsWith('Which campaign used'))
  expect(gq.length).toBeGreaterThan(0)
  expect(cq.length).toBeGreaterThan(0)
  for (const q of gq) {
    const c = campaigns.find((x) => q.prompt.endsWith('campaign ' + x.name + '?'))
    expect(groups.find((g) => g.name === q.answer).id).toBe(c.groups[0])
  }
  for (const q of cq) expect(idx.usedBy.get(q.techId).campaigns.map((c) => c.name)).toContain(q.answer)
})
