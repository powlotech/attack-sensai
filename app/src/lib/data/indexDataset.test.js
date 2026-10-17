import { expect, test } from 'vitest'
import bundle from '../../../../tools/build-data/test/fixtures/enterprise-mini.json'
import { transform } from '../../../../tools/build-data/src/transform.js'
import { indexDataset } from './indexDataset.js'

const idx = indexDataset(transform(bundle, { builtAt: 'x' }))

test('children of a parent technique', () => {
  expect(idx.childrenOf.get('T1059').map((t) => t.id)).toContain('T1059.001')
})
test('usedBy lists groups and software', () => {
  expect(idx.usedBy.get('T1059.001').groups.map((g) => g.id)).toContain('G0016')
  expect(idx.usedBy.get('T1059.001').software).toBeInstanceOf(Array)
})
test('topByTactic has only top-level techniques, sorted by name', () => {
  const list = idx.topByTactic.get('execution')
  expect(list.length).toBeGreaterThan(0)
  expect(list.every((t) => !t.isSub)).toBe(true)
  const names = list.map((t) => t.name)
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
})
test('byId, groupsById, softwareById', () => {
  expect(idx.byId.get('T1059.001').name).toBe('PowerShell')
  expect(idx.groupsById.get('G0016').name).toBe('APT29')
  expect(idx.softwareById.get('S0154').name).toBe('Cobalt Strike')
})
