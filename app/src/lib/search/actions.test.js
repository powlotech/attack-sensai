import { expect, test } from 'vitest'
import bundle from '../../../../tools/build-data/test/fixtures/enterprise-mini.json'
import { transform } from '../../../../tools/build-data/src/transform.js'
import { highlightFor, layerEntriesFor } from './actions.js'

const g = transform(bundle, { builtAt: 'x' }).groups.find((x) => x.id === 'G0016')

test('layerEntriesFor scores every technique 1', () => {
  const e = layerEntriesFor(g)
  expect(Object.keys(e).sort()).toEqual([...g.techniques].sort())
  expect(g.techniques.length).toBeGreaterThan(0)
  for (const v of Object.values(e)) expect(v).toEqual({ score: 1, comment: '', learned: false })
})

test('highlightFor labels with the name and carries the ids', () => {
  const h = highlightFor(g)
  expect(h.label).toBe(g.name)
  expect(h.ids).toEqual(new Set(g.techniques))
})
