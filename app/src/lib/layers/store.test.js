import 'fake-indexeddb/auto'
import { beforeEach, expect, test, vi } from 'vitest'
import {
  createLayer, deleteLayer, duplicateLayer, ensureDefaultLayer, getActiveLayerId, getLayer,
  isPersistent, listLayers, orphanCount, renameLayer, setActiveLayerId, setEntry,
} from './store.js'
import { openDb } from '../data/db.js'

beforeEach(async () => {
  const db = await openDb()
  await db.clear('layers')
  db.close()
})

test('ensureDefaultLayer is idempotent', async () => {
  await ensureDefaultLayer()
  await ensureDefaultLayer()
  const all = await listLayers()
  expect(all).toHaveLength(1)
  expect(all[0].name).toBe('Learning progress')
})

test('setEntry clamps score and merges patches', async () => {
  const l = await createLayer('L')
  let r = await setEntry(l.id, 'T1059', { score: 9 })
  expect(r.entries.T1059).toEqual({ score: 4, comment: '', learned: false })
  r = await setEntry(l.id, 'T1059', { comment: 'hi' })
  expect(r.entries.T1059).toEqual({ score: 4, comment: 'hi', learned: false })
  r = await setEntry(l.id, 'T1059', { score: -3 })
  expect(r.entries.T1059.score).toBe(0)
})

test('an all-default entry is removed', async () => {
  const l = await createLayer('L')
  await setEntry(l.id, 'T1059', { score: 2 })
  const r = await setEntry(l.id, 'T1059', { score: 0 })
  expect(r.entries).toEqual({})
})

test('duplicateLayer, renameLayer, deleteLayer', async () => {
  const l = await createLayer('Mine', { T1059: { score: 1, comment: '', learned: false } })
  const copy = await duplicateLayer(l.id)
  expect(copy.id).not.toBe(l.id)
  expect(copy.name).toBe('Mine (copy)')
  expect(copy.entries).toEqual(l.entries)
  await renameLayer(l.id, 'Renamed')
  expect((await getLayer(l.id)).name).toBe('Renamed')
  await deleteLayer(l.id)
  expect(await getLayer(l.id)).toBeUndefined()
})

test('orphans are counted but never dropped (Review Focus 1)', async () => {
  const l = await createLayer('L', { T9999: { score: 3, comment: 'gone', learned: false } })
  const idx = { byId: new Map([['T1059', {}]]) }
  expect(orphanCount(l, idx)).toBe(1)
  await setEntry(l.id, 'T1059', { score: 1 })
  const after = (await listLayers()).find((x) => x.id === l.id)
  expect(Object.keys(after.entries).sort()).toEqual(['T1059', 'T9999'])
  expect(orphanCount(after, idx)).toBe(1)
})

test('active layer id round-trips and survives broken localStorage', () => {
  setActiveLayerId('abc')
  expect(getActiveLayerId()).toBe('abc')
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(getActiveLayerId()).toBeNull()
  spy.mockRestore()
})

test('IndexedDB unavailable: not persistent, CRUD works in memory', async () => {
  vi.resetModules()
  vi.doMock('../data/db.js', () => ({ openDb: () => Promise.reject(new Error('no idb')) }))
  const mem = await import('./store.js')
  expect(await mem.isPersistent()).toBe(false)
  const l = await mem.ensureDefaultLayer()
  await mem.setEntry(l.id, 'T1', { score: 2 })
  expect((await mem.getLayer(l.id)).entries.T1.score).toBe(2)
  expect(await mem.listLayers()).toHaveLength(1)
  vi.doUnmock('../data/db.js')
})
