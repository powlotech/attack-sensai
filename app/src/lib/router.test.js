import { expect, test } from 'vitest'
import { parseHash } from './router.js'

test('query string parses', () => {
  expect(parseHash('#/matrix?tactic=execution&view=overview')).toEqual({
    name: 'matrix',
    params: {},
    query: { tactic: 'execution', view: 'overview' },
  })
})
test('technique id param, including sub-technique', () => {
  expect(parseHash('#/technique/T1059.001').params.id).toBe('T1059.001')
  expect(parseHash('#/technique/T1059.001').name).toBe('technique')
})
test('group and software detail routes', () => {
  expect(parseHash('#/group/G0016')).toMatchObject({ name: 'group', params: { id: 'G0016' } })
  expect(parseHash('#/software/S0154')).toMatchObject({ name: 'software', params: { id: 'S0154' } })
})
test('empty, bare and unknown hashes fall back to learn', () => {
  for (const h of ['', '#', '#/', '#/nonsense']) expect(parseHash(h).name).toBe('learn')
})
test('malformed percent-encoding does not throw', () => {
  expect(parseHash('#/matrix?tactic=%E0%A4%A').query.tactic).toBeDefined()
})
