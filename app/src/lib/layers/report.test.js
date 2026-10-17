import { expect, test } from 'vitest'
import { layerCsv, timelineMarkdown, timelinePdf } from './report.js'

const idx = { byId: new Map([['T1', { id: 'T1', name: 'A', tactics: ['x', 'y'] }], ['T2', { id: 'T2', name: 'B', tactics: [] }]]) }
const layer = { name: 'L', entries: {
  T2: { score: 0, comment: '', learned: false, order: 1, when: 'day 1' },
  T1: { score: 3, comment: 'say "hi"', learned: true },
  GONE: { score: 1, comment: '', learned: false },
} }

test('csv quotes fields and skips unknown techniques', () => {
  expect(layerCsv(layer, idx)).toBe('"id","name","tactics","score","learned","comment"\n"T1","A","x y","3","yes","say ""hi"""\n"T2","B","","0","no",""\n')
})
test('markdown lists steps', () => {
  expect(timelineMarkdown(layer, idx)).toBe('# L\n\n1. **T2** B (day 1)\n')
})

test('timeline pdf is a real PDF', async () => {
  const head = new Uint8Array(await (await timelinePdf(layer, idx)).arrayBuffer()).slice(0, 5)
  expect(String.fromCharCode(...head)).toBe('%PDF-')
})
