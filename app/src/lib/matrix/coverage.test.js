import { describe, it, expect } from 'vitest'
import { coverage, nextToLearn } from './coverage.js'

const dataset = {
  tactics: [{ shortname: 'a' }, { shortname: 'b' }],
  techniques: [
    { id: 'T1', tactics: ['a', 'b'] },
    { id: 'T1.1', isSub: true, parent: 'T1' },
    { id: 'T2', tactics: ['b'] },
  ],
}

describe('coverage', () => {
  const rows = coverage(dataset, { T1: { learned: true }, T2: {} })
  it('counts subs under parent tactics', () => {
    expect(rows.map((r) => [r.learned, r.total])).toEqual([[1, 2], [1, 3]])
  })
  it('picks unlearned top-level techniques from the weakest tactic', () => {
    expect(nextToLearn(rows).map((t) => t.id)).toEqual(['T2'])
  })
})
