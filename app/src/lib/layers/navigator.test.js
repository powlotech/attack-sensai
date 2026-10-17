import { expect, test } from 'vitest'
import sample from './test/fixtures/navigator-sample.json'
import { LayerImportError, exportFileName, fromNavigatorLayer, toNavigatorLayer } from './navigator.js'

const known = (...ids) => new Set(ids)
const layer = {
  id: 'x', name: 'My layer: v1!', createdAt: 1, updatedAt: 2,
  entries: {
    T1059: { score: 3, comment: 'seen in lab', learned: true },
    'T1059.001': { score: 0, comment: 'note only', learned: false },
    T1078: { score: 2, comment: '', learned: false },
  },
}
const IDS = known('T1059', 'T1059.001', 'T1078')

test('export shape', () => {
  const n = toNavigatorLayer(layer, { attackVersion: '20.0' })
  expect(n).toMatchObject({ name: 'My layer: v1!', domain: 'enterprise-attack', versions: { attack: '20.0', layer: '4.5' } })
  expect(n.versions.navigator).toBeTruthy()
  expect(n.gradient).toMatchObject({ minValue: 0, maxValue: 4 })
  expect(n.legendItems).toHaveLength(4)
  expect(n.techniques.find((t) => t.techniqueID === 'T1059')).toMatchObject({
    score: 3, comment: 'seen in lab', enabled: true, metadata: [{ name: 'learned', value: 'true' }],
  })
  expect(n.techniques.find((t) => t.techniqueID === 'T1078').metadata).toBeUndefined()
})

test('round trip preserves score, comment and learned', () => {
  const back = fromNavigatorLayer(toNavigatorLayer(layer, { attackVersion: '20.0' }), { knownIds: IDS })
  expect(back.entries).toEqual(layer.entries)
  expect(back.name).toBe(layer.name)
  expect(back.unknownCount).toBe(0)
})

test('order and when round-trip through Navigator metadata', () => {
  const l = { ...layer, entries: { T1059: { score: 1, comment: '', learned: true, order: 2, when: 'day 1' }, T1078: { score: 0, comment: '', learned: false, order: 1 } } }
  const n = toNavigatorLayer(l, { attackVersion: '20.0' })
  expect(n.techniques.find((t) => t.techniqueID === 'T1059').metadata).toEqual([
    { name: 'learned', value: 'true' }, { name: 'order', value: '2' }, { name: 'when', value: 'day 1' },
  ])
  expect(fromNavigatorLayer(n, { knownIds: IDS }).entries).toEqual(l.entries)
  const bad = { name: 'x', techniques: [{ techniqueID: 'T1078', score: 1, metadata: [{ name: 'order', value: 'abc' }] }] }
  expect(fromNavigatorLayer(bad, { knownIds: IDS }).entries.T1078.order).toBeUndefined()
})

test('official sample keeps scores and comments', () => {
  const ids = new Set(sample.techniques.map((t) => t.techniqueID))
  const r = fromNavigatorLayer(sample, { knownIds: ids })
  const t = sample.techniques.find((x) => x.techniqueID === 'T1110.001')
  expect(r.entries['T1110.001']).toMatchObject({ score: 4, comment: t.comment }) // 100 clamps to 4
  expect(r.entries.T1110.comment).toBe('This is a comment for technique T1110')
  expect(r.unknownCount).toBe(0)
})

test('same technique under two tactics: highest score, comments joined', () => {
  const r = fromNavigatorLayer(
    { name: 'n', domain: 'enterprise-attack', techniques: [
      { techniqueID: 'T1078', tactic: 'persistence', score: 1, comment: 'a' },
      { techniqueID: 'T1078', tactic: 'discovery', score: 3, comment: 'b' },
    ] },
    { knownIds: known('T1078') },
  )
  expect(r.entries.T1078).toEqual({ score: 3, comment: 'a\nb', learned: false })
})

test('unknown ids are counted and excluded', () => {
  const r = fromNavigatorLayer(
    { name: 'n', domain: 'enterprise-attack', techniques: [{ techniqueID: 'T0000', score: 2 }, { techniqueID: 'T1078', score: 2 }] },
    { knownIds: known('T1078') },
  )
  expect(r.unknownCount).toBe(1)
  expect(Object.keys(r.entries)).toEqual(['T1078'])
})

test('other domain is rejected (Review Focus 2)', () => {
  expect.assertions(3)
  try {
    fromNavigatorLayer({ name: 'm', domain: 'mobile-attack', techniques: [] }, { knownIds: IDS })
  } catch (e) {
    expect(e).toBeInstanceOf(LayerImportError)
    expect(e.field).toBe('domain')
    expect(e.message).toMatch(/Enterprise/)
  }
})

test.each([[{}, 'techniques'], [[], 'layer'], ['x', 'layer'], [null, 'layer']])('invalid input %j', (input, field) => {
  expect.assertions(2)
  try {
    fromNavigatorLayer(input, { knownIds: IDS })
  } catch (e) {
    expect(e).toBeInstanceOf(LayerImportError)
    expect(e.field).toBe(field)
  }
})

test('score clamped; non-numeric treated as 0 but comment kept', () => {
  const r = fromNavigatorLayer(
    { name: 'n', domain: 'enterprise-attack', techniques: [
      { techniqueID: 'T1059', score: 99 },
      { techniqueID: 'T1078', score: 'high', comment: 'keep me' },
    ] },
    { knownIds: IDS },
  )
  expect(r.entries.T1059.score).toBe(4)
  expect(r.entries.T1078).toEqual({ score: 0, comment: 'keep me', learned: false })
})

test('exportFileName', () => {
  expect(exportFileName(layer)).toBe('my-layer-v1.layer.json')
  expect(exportFileName({ name: '!!!' })).toBe('layer.layer.json')
})

test('ICS layers export as ics-attack and import back with their domain', () => {
  const out = toNavigatorLayer({ name: 'P', domain: 'ics', entries: { T0800: { score: 2, comment: '', learned: false } } }, { attackVersion: '20.0' })
  expect(out.domain).toBe('ics-attack')
  expect(toNavigatorLayer({ name: 'E', entries: {} }, { attackVersion: '20.0' }).domain).toBe('enterprise-attack')
  const r = fromNavigatorLayer(out, { knownIds: new Set(['T0800']) })
  expect(r.domain).toBe('ics')
  expect(fromNavigatorLayer({ techniques: [] }, { knownIds: new Set() }).domain).toBe('enterprise')
  expect(() => fromNavigatorLayer({ domain: 'mobile-attack', techniques: [] }, { knownIds: new Set() })).toThrow(/Enterprise and ICS/)
})
