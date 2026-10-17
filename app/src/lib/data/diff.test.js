import { describe, it, expect } from 'vitest'
import { diffDatasets } from './diff.js'

const t = (id, extra = {}) => ({ id, name: id, description: 'd', tactics: ['x'], ...extra })

describe('diffDatasets', () => {
  it('finds added, removed and changed', () => {
    const old = { attackVersion: '1', techniques: [t('T1'), t('T2'), t('T3')], groups: [], software: [] }
    const next = { attackVersion: '2', techniques: [t('T1', { description: 'new' }), t('T3', { url: 'u' }), t('T4')], groups: [], software: [] }
    const d = diffDatasets(old, next)
    expect(d.techniques.added.map((o) => o.id)).toEqual(['T4'])
    expect(d.techniques.removed.map((o) => o.id)).toEqual(['T2'])
    expect(d.techniques.changed.map((o) => o.id)).toEqual(['T1'])
    expect([d.from, d.to]).toEqual(['1', '2'])
  })
})

describe('diffDatasets campaigns', () => {
  it('lists added campaigns, even when the old dataset has none', () => {
    const c = { id: 'C1', name: 'C1', description: '' }
    const d = diffDatasets({ attackVersion: '1', techniques: [], groups: [], software: [] }, { attackVersion: '2', techniques: [], groups: [], software: [], campaigns: [c] })
    expect(d.campaigns.added.map((o) => o.id)).toEqual(['C1'])
  })
})
