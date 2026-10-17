import 'fake-indexeddb/auto'
import { beforeEach, expect, test, vi } from 'vitest'
import { checkForUpdate, getDataStatus, loadDataset } from './dataset.js'
import { openDb } from './db.js'

const sha256 = async (text) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

const bundled = { attackVersion: '1', builtAt: '2026-01-01T00:00:00Z', techniques: [], tactics: [], groups: [], software: [] }
const newer = { ...bundled, attackVersion: '2', builtAt: '2026-02-01T00:00:00Z' }

/** fetch stub serving the bundled copy plus a remote version.json/attack.json pair. */
function stubFetch({ remote = newer, sha, offline = false } = {}) {
  const body = JSON.stringify(remote)
  return vi.fn(async (url) => {
    if (offline) throw new TypeError('Failed to fetch')
    const ok = (text) => ({ ok: true, json: async () => JSON.parse(text), text: async () => text })
    if (url.endsWith('version.json')) {
      return ok(JSON.stringify({ attackVersion: remote.attackVersion, builtAt: remote.builtAt, sha256: sha ?? (await sha256(body)), bytes: body.length }))
    }
    return ok(url.includes('remote') ? body : JSON.stringify(bundled))
  })
}

beforeEach(async () => {
  const db = await openDb()
  await db.clear('meta')
  db.close()
})

// Remote and bundled attack.json URLs differ only in the stub's eyes: the stub serves `remote` for every
// attack.json after the first load, so we flip it by passing a different stub.
const remoteFetch = (opts) => {
  const f = stubFetch(opts)
  return vi.fn((url) => f(url.endsWith('attack.json') ? url.replace('attack.json', 'remote/attack.json') : url))
}

test('loadDataset: bundled first, cache after an update', async () => {
  const first = await loadDataset({ fetchFn: stubFetch() })
  expect(first).toMatchObject({ source: 'bundled', data: { attackVersion: '1' } })
  const r = await checkForUpdate({ current: first.data, force: true, fetchFn: remoteFetch() })
  expect(r).toMatchObject({ status: 'updated', data: { attackVersion: '2' } })
  const second = await loadDataset({ fetchFn: stubFetch() })
  expect(second).toMatchObject({ source: 'cache', data: { attackVersion: '2' } })
})

test('checkForUpdate: skipped within 24h unless forced', async () => {
  const now = Date.now()
  const f = remoteFetch()
  const a = await checkForUpdate({ current: bundled, now, fetchFn: f })
  expect(a.status).toBe('updated')
  const b = await checkForUpdate({ current: a.data, now: now + 3600_000, fetchFn: f })
  expect(b.status).toBe('skipped')
  const c = await checkForUpdate({ current: a.data, now: now + 3600_000, force: true, fetchFn: f })
  expect(c.status).toBe('current')
  const d = await checkForUpdate({ current: a.data, now: now + 25 * 3600_000, fetchFn: f })
  expect(d.status).toBe('current')
})

test('sha256 mismatch: error, cache unchanged', async () => {
  const r = await checkForUpdate({ current: bundled, force: true, fetchFn: remoteFetch({ sha: 'deadbeef' }) })
  expect(r.status).toBe('error')
  expect(r.message).toMatch(/integrity/i)
  expect((await loadDataset({ fetchFn: stubFetch() })).source).toBe('bundled')
  expect((await getDataStatus()).lastError).toMatch(/integrity/i)
})

test('storage failure while caching keeps the current dataset (Review Focus 4)', async () => {
  const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
    throw new DOMException('quota', 'QuotaExceededError')
  })
  const r = await checkForUpdate({ current: bundled, force: true, fetchFn: remoteFetch() })
  put.mockRestore()
  expect(r.status).toBe('error')
  expect((await loadDataset({ fetchFn: stubFetch() })).data.attackVersion).toBe('1')
})

test('offline: error, no throw', async () => {
  const r = await checkForUpdate({ current: bundled, force: true, fetchFn: stubFetch({ offline: true }) })
  expect(r.status).toBe('error')
})

test('ICS has its own files and cache; Enterprise is untouched', async () => {
  const f = stubFetch()
  await loadDataset({ fetchFn: f, domain: 'ics' })
  expect(f.mock.calls[0][0]).toMatch(/data\/ics\.json$/)
  const icsFetch = vi.fn((url) => stubFetch()(url.replace('ics.json', 'remote/ics.json')))
  const r = await checkForUpdate({ current: bundled, force: true, domain: 'ics', fetchFn: icsFetch })
  expect(r.status).toBe('updated')
  expect(icsFetch.mock.calls.map((c) => c[0]).join()).toMatch(/ics-version\.json.*ics\.json/)
  expect((await loadDataset({ fetchFn: stubFetch(), domain: 'ics' })).source).toBe('cache')
  expect((await loadDataset({ fetchFn: stubFetch() })).source).toBe('bundled')
  expect((await getDataStatus('ics')).attackVersion).toBe('2')
  expect((await getDataStatus()).attackVersion).toBeNull()
})
