import { expect, test } from 'vitest'
import bundle from './fixtures/enterprise-mini.json' with { type: 'json' }
import { transform } from '../src/transform.js'
import { stripCitations } from '../src/stripCitations.js'

const d = transform(bundle, { builtAt: '2026-10-17T00:00:00Z' })
const t = (id) => d.techniques.find((x) => x.id === id)

test('tactics in matrix order', () => {
  expect(d.tactics.map((x) => x.shortname).slice(0, 4)).toEqual([
    'reconnaissance',
    'resource-development',
    'initial-access',
    'execution',
  ])
  expect(d.tactics).toHaveLength(15) // docs/sources.md: v20.0 has 15 tactics
  expect(d.tactics[0]).toMatchObject({ id: 'TA0043', name: 'Reconnaissance' })
})

test('dataset header', () => {
  expect(d.attackVersion).toBe('20.0')
  expect(d.builtAt).toBe('2026-10-17T00:00:00Z')
})

test('sub-technique parenting', () => {
  expect(t('T1059.001')).toMatchObject({ name: 'PowerShell', parent: 'T1059', isSub: true, tactics: ['execution'] })
  expect(t('T1059')).toMatchObject({ parent: null, isSub: false })
  expect(t('T1059.001').url).toBe('https://attack.mitre.org/techniques/T1059/001/')
  expect(t('T1059').url).toBe('https://attack.mitre.org/techniques/T1059/')
})

test('revoked and deprecated dropped', () => {
  const ids = d.techniques.map((x) => x.id)
  for (const id of ['T1066', 'T1053.001', 'T1153', 'T1053.004']) expect(ids).not.toContain(id)
})

test('platforms copied verbatim', () => {
  expect(t('T1059').platforms).toContain('Windows')
})

test('group uses links', () => {
  const g = d.groups.find((x) => x.id === 'G0016')
  expect(g.name).toBe('APT29')
  expect(g.aliases.length).toBeGreaterThan(0)
  expect(g.techniques).toContain('T1059.001')
})

test('software typed', () => {
  const s = d.software.find((x) => x.id === 'S0154')
  expect(['malware', 'tool']).toContain(s.type)
  expect(d.software.find((x) => x.id === 'S0154').techniques.length).toBeGreaterThan(0)
})

test('citations stripped', () => {
  expect(JSON.stringify(d)).not.toMatch(/\(Citation:/)
  expect(stripCitations('a (Citation: X Y) b')).toBe('a b')
})

test('dangling relationships ignored', () => {
  for (const g of d.groups) for (const id of g.techniques) expect(t(id)).toBeTruthy()
})

test('ICS bundle: mitre-ics-attack kill chain gives every technique a tactic', async () => {
  const ics = (await import('./fixtures/ics-mini.json', { with: { type: 'json' } })).default
  const x = transform(ics, { builtAt: 'x' })
  expect(x.tactics.map((t) => t.shortname)).toEqual(expect.arrayContaining(['initial-access', 'inhibit-response-function']))
  expect(x.techniques.length).toBeGreaterThan(0)
  expect(x.techniques.every((t) => /^T\d{4}(\.\d{3})?$/.test(t.id) && t.tactics.length > 0)).toBe(true)
})

test('campaigns carry techniques and attributed groups', () => {
  expect(d.campaigns.find((c) => c.id === 'C0001')).toMatchObject({
    name: 'Mini Campaign',
    aliases: ['MC-2020'],
    firstSeen: '2020-01',
    lastSeen: '2021-06',
    groups: ['G0016'],
    techniques: ['T1059.001'],
  })
})
