import 'fake-indexeddb/auto'
import { beforeEach, expect, test } from 'vitest'
import { createLayer, getLayer, listLayers, setEntry } from '../layers/store.js'
import { openDb } from '../data/db.js'
import { exportProgress, importProgress } from './progress.js'

beforeEach(async () => {
  const db = await openDb()
  await db.clear('layers')
  db.close()
})

test('round trip: layers re-import as a merge, not a duplicate', async () => {
  const l = await createLayer('Progress')
  await setEntry(l.id, 'T1059', { learned: true, score: 2 })
  const file = await exportProgress()
  await setEntry(l.id, 'T1059', { score: 3 })
  const r = await importProgress(file)
  expect(r.layers).toBe(1)
  expect(await listLayers()).toHaveLength(1)
  const e = (await getLayer(l.id)).entries.T1059
  expect(e.learned).toBe(true)
  expect(e.score).toBe(3) // higher score wins
})

test('same name, different id merges; unknown layer is added; junk is rejected', async () => {
  await createLayer('Progress')
  await importProgress({ type: 'attack-learner-progress', layers: [
    { id: 'other', name: 'Progress', createdAt: 1, updatedAt: 1, entries: { T1: { score: 1, comment: '', learned: true } } },
    { id: 'new', name: 'Fresh', createdAt: 1, updatedAt: 1, entries: {} },
  ] })
  const all = await listLayers()
  expect(all.map((x) => x.name).sort()).toEqual(['Fresh', 'Progress'])
  expect(all.find((x) => x.name === 'Progress').entries.T1.learned).toBe(true)
  await expect(importProgress({ type: 'nope' })).rejects.toThrow()
})
