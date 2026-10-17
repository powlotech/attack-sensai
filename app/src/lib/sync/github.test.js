import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createLayer, listLayers, setEntry } from '../layers/store.js'
import { openDb } from '../data/db.js'
import { syncWithGithub } from './github.js'

const cfg = { token: 't', repo: 'me/attack-sensai-sync', last: 0 }
beforeEach(async () => {
  const db = await openDb()
  await db.clear('layers')
  db.close()
  vi.stubGlobal('localStorage', { getItem: () => null, setItem() {} })
})
afterEach(() => vi.unstubAllGlobals())

function fakeRepo() {
  let file = null
  const fetch = vi.fn(async (_u, { method, body }) => {
    if (method === 'GET') return file ? { status: 200, json: async () => file } : { status: 404 }
    const b = JSON.parse(body)
    if (file && b.sha !== file.sha) return { ok: false, status: 409 }
    file = { sha: 's' + Math.random(), content: b.content }
    return { ok: true, status: 200 }
  })
  vi.stubGlobal('fetch', fetch)
  return { get: () => file }
}

test('first sync creates the file; second device pulls it', async () => {
  const repo = fakeRepo()
  const l = await createLayer('Progress')
  await setEntry(l.id, 'T1', { learned: true, comment: 'ü' })
  await syncWithGithub(cfg)
  expect(repo.get()).toBeTruthy()
  const db = await openDb() // simulate a fresh device
  await db.clear('layers')
  db.close()
  await syncWithGithub(cfg)
  const [got] = await listLayers()
  expect(got.entries.T1).toMatchObject({ learned: true, comment: 'ü' })
})

test('rejects missing config', async () => {
  await expect(syncWithGithub({ token: '', repo: 'x' })).rejects.toThrow('first')
})
