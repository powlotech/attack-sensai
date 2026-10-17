import { expect, test } from 'vitest'
import bundle from '../../../../tools/build-data/test/fixtures/enterprise-mini.json'
import { transform } from '../../../../tools/build-data/src/transform.js'
import { indexDataset } from '../data/indexDataset.js'
import { buildSearchIndex, normaliseTechniqueId, search, techniquesForPlatforms } from './search.js'

const idx = indexDataset(transform(bundle, { builtAt: 'x' }))
const si = buildSearchIndex(idx)

test('all four ID spellings normalise', () => {
  for (const q of ['t1059.001', '1059.001', 'T1059/001', 'T1059 001']) expect(normaliseTechniqueId(q)).toBe('T1059.001')
  expect(normaliseTechniqueId('powershell')).toBeNull()
  expect(normaliseTechniqueId('T1059')).toBe('T1059')
})
test('name search finds PowerShell first', () => {
  expect(search(si, 'powershell', { kind: 'techniques' })[0].id).toBe('T1059.001')
})
test('exact ID beats everything', () => {
  expect(search(si, '1059/001', { kind: 'techniques' })[0].id).toBe('T1059.001')
})
test('alias search finds APT29', () => {
  expect(search(si, 'cozy', { kind: 'groups' })[0].id).toBe('G0016')
})
test('Windows filter excludes Unix Shell', () => {
  const all = search(si, 'shell', { kind: 'techniques' }).map((r) => r.id)
  const win = search(si, 'shell', { kind: 'techniques', platforms: new Set(['windows']) }).map((r) => r.id)
  expect(all).toContain('T1059.004')
  expect(win).not.toContain('T1059.004')
  expect(techniquesForPlatforms(idx, new Set(['windows'])).has('T1059.004')).toBe(false)
})
test('hostile and empty queries never throw', () => {
  for (const q of ['C++', '(', '*', 'a'.repeat(5000)]) expect(search(si, q, { kind: 'techniques' })).toBeInstanceOf(Array)
  expect(search(si, '', { kind: 'techniques' })).toEqual([])
  expect(search(si, '   ', { kind: 'groups' })).toEqual([])
})
test('results are capped at 50', () => {
  expect(search(si, 'e', { kind: 'techniques' }).length).toBeLessThanOrEqual(50)
})
