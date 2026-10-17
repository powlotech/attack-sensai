import { expect, test } from 'vitest'
import { effectiveScore, rolledScore, tacticAbbr, tacticSummary } from './summary.js'

const t = (id, extra = {}) => ({ id, name: id, isSub: false, tactics: ['execution'], ...extra })
const idx = {
  topByTactic: new Map([['execution', [t('T1'), t('T2'), t('T3')]], ['empty', []]]),
  childrenOf: new Map([['T1', [t('T1.001', { isSub: true })]]]),
}
const layer = { entries: { T1: { score: 2 }, 'T1.001': { score: 4 }, T2: { score: 0 }, GONE: { score: 3 } } }

test('effectiveScore reads the entry, defaulting to 0', () => {
  expect(effectiveScore(layer, 'T1')).toBe(2)
  expect(effectiveScore(layer, 'T3')).toBe(0)
  expect(effectiveScore(null, 'T1')).toBe(0)
})
test('tacticSummary counts top-level techniques scored above 0 only', () => {
  expect(tacticSummary(idx, layer, 'execution')).toEqual({ scored: 1, total: 3 })
  expect(tacticSummary(idx, layer, 'empty')).toEqual({ scored: 0, total: 0 })
  expect(tacticSummary(idx, null, 'execution')).toEqual({ scored: 0, total: 3 })
  expect(tacticSummary(idx, layer, 'unknown')).toEqual({ scored: 0, total: 0 })
})
test('a technique whose only scored child is a sub-technique counts as scored', () => {
  const i = { topByTactic: new Map([['execution', [t('T3')]]]), childrenOf: new Map([['T3', [t('T3.001', { isSub: true })]]]) }
  const l = { entries: { 'T3.001': { score: 3 } } }
  expect(rolledScore(i, l, 'T3')).toBe(3)
  expect(rolledScore(i, null, 'T3')).toBe(0)
  expect(tacticSummary(i, l, 'execution')).toEqual({ scored: 1, total: 1 })
})
test('tacticAbbr is two characters, with a fallback for new tactics', () => {
  expect(tacticAbbr('command-and-control')).toBe('C2')
  expect(tacticAbbr('stealth')).toBe('ST')
  expect(tacticAbbr('brand-new')).toBe('BR')
})
