import { expect, test } from 'vitest'
import bundle from './fixtures/enterprise-mini.json' with { type: 'json' }
import { transform } from '../src/transform.js'
import { sanityCheck } from '../src/sanity.js'

const d = transform(bundle, { builtAt: '2026-10-17T00:00:00Z' })

test('fixture passes with relaxed minimum', () => {
  expect(sanityCheck(d, { minTechniques: 1 })).toEqual([])
})

test('too few techniques', () => {
  const small = { ...d, techniques: d.techniques.slice(0, 50) }
  expect(sanityCheck(small).join()).toMatch(/techniques/)
})

test('unknown tactic on a technique', () => {
  const bad = { ...d, techniques: [{ ...d.techniques[0], tactics: ['nope'] }] }
  expect(sanityCheck(bad, { minTechniques: 1 }).join()).toMatch(/tactic/)
})

test('no tactics, no groups', () => {
  const msgs = sanityCheck({ ...d, tactics: [], groups: [] }, { minTechniques: 1 }).join()
  expect(msgs).toMatch(/tactics/)
  expect(msgs).toMatch(/groups/)
})
