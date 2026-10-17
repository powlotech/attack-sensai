import { BUNDLED_BASE, CHECK_INTERVAL_MS, DATA_BASE } from '../config.js'
import { openDb } from './db.js'

async function getMeta(key) {
  const db = await openDb()
  try {
    return await db.get('meta', key)
  } finally {
    db.close()
  }
}

async function setMeta(entries) {
  const db = await openDb()
  try {
    const tx = db.transaction('meta', 'readwrite')
    for (const [k, v] of Object.entries(entries)) tx.store.put(v, k)
    await tx.done
  } finally {
    db.close()
  }
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Cached dataset if there is one, otherwise the copy bundled with the app. */
export async function loadDataset({ fetchFn = fetch } = {}) {
  try {
    const cached = await getMeta('dataset')
    if (cached) return { data: cached, source: 'cache' }
  } catch {
    // IndexedDB unavailable: fall through to the bundled copy
  }
  const res = await fetchFn(BUNDLED_BASE + 'attack.json')
  if (!res.ok) throw new Error(`Bundled data missing (HTTP ${res.status})`)
  return { data: await res.json(), source: 'bundled' }
}

async function fetchRemote(fetchFn, current) {
  const vres = await fetchFn(DATA_BASE + 'version.json', { cache: 'no-store' })
  if (!vres.ok) throw new Error(`version.json: HTTP ${vres.status}`)
  const remote = await vres.json()
  if (!(remote.builtAt > current.builtAt)) return null
  const ares = await fetchFn(DATA_BASE + 'attack.json')
  if (!ares.ok) throw new Error(`attack.json: HTTP ${ares.status}`)
  const text = await ares.text()
  if ((await sha256Hex(text)) !== remote.sha256) throw new Error('Integrity check failed: data hash mismatch')
  return JSON.parse(text)
}

/**
 * Look for newer data. Never throws: failures come back as status 'error' and the caller keeps its data.
 * @returns {Promise<{status: 'updated'|'current'|'skipped'|'error', data?: object, message?: string}>}
 */
export async function checkForUpdate({ current, force = false, now = Date.now(), fetchFn = fetch }) {
  try {
    const last = await getMeta('lastChecked').catch(() => undefined)
    if (!force && last && now - last < CHECK_INTERVAL_MS) return { status: 'skipped' }
    const next = await fetchRemote(fetchFn, current)
    if (!next) {
      await setMeta({ lastChecked: now, lastError: null })
      return { status: 'current' }
    }
    await setMeta({ dataset: next, lastChecked: now, lastError: null })
    return { status: 'updated', data: next }
  } catch (e) {
    const message = e?.message || String(e)
    await setMeta({ lastChecked: now, lastError: message }).catch(() => {})
    return { status: 'error', message }
  }
}

export async function getDataStatus() {
  const get = (k) => getMeta(k).catch(() => undefined)
  const dataset = await get('dataset')
  return {
    attackVersion: dataset?.attackVersion ?? null,
    builtAt: dataset?.builtAt ?? null,
    lastChecked: (await get('lastChecked')) ?? null,
    lastError: (await get('lastError')) ?? null,
  }
}
