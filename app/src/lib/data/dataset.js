import { BUNDLED_BASE, CHECK_INTERVAL_MS, DATA_BASE } from '../config.js'
import { openDb } from './db.js'

/** Per-domain file names; non-Enterprise meta keys get a ':<domain>' suffix so each matrix has its own cache and check time. */
const FILES = {
  enterprise: { file: 'attack.json', version: 'version.json' },
  ics: { file: 'ics.json', version: 'ics-version.json' },
  mobile: { file: 'mobile.json', version: 'mobile-version.json' },
}
const metaKey = (key, domain) => (domain === 'enterprise' ? key : `${key}:${domain}`)

async function getMeta(key) {
  const db = await openDb()
  try {
    return await db.get('meta', key)
  } finally {
    db.close()
  }
}

async function setMeta(entries, domain = 'enterprise') {
  const db = await openDb()
  try {
    const tx = db.transaction('meta', 'readwrite')
    for (const [k, v] of Object.entries(entries)) tx.store.put(v, metaKey(k, domain))
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
export async function loadDataset({ fetchFn = fetch, domain = 'enterprise' } = {}) {
  try {
    const cached = await getMeta(metaKey('dataset', domain))
    if (cached) return { data: cached, source: 'cache' }
  } catch {
    // IndexedDB unavailable: fall through to the bundled copy
  }
  const res = await fetchFn(BUNDLED_BASE + FILES[domain].file)
  if (!res.ok) throw new Error(`Bundled data missing (HTTP ${res.status})`)
  return { data: await res.json(), source: 'bundled' }
}

async function fetchRemote(fetchFn, current, domain) {
  const { file, version } = FILES[domain]
  const vres = await fetchFn(DATA_BASE + version, { cache: 'no-store' })
  if (!vres.ok) throw new Error(`${version}: HTTP ${vres.status}`)
  const remote = await vres.json()
  if (!(remote.builtAt > current.builtAt)) return null
  const ares = await fetchFn(DATA_BASE + file)
  if (!ares.ok) throw new Error(`${file}: HTTP ${ares.status}`)
  const text = await ares.text()
  if ((await sha256Hex(text)) !== remote.sha256) throw new Error('Integrity check failed: data hash mismatch')
  return JSON.parse(text)
}

/**
 * Look for newer data. Never throws: failures come back as status 'error' and the caller keeps its data.
 * @returns {Promise<{status: 'updated'|'current'|'skipped'|'error', data?: object, message?: string}>}
 */
export async function checkForUpdate({ current, force = false, now = Date.now(), fetchFn = fetch, domain = 'enterprise' }) {
  try {
    const last = await getMeta(metaKey('lastChecked', domain)).catch(() => undefined)
    if (!force && last && now - last < CHECK_INTERVAL_MS) return { status: 'skipped' }
    const next = await fetchRemote(fetchFn, current, domain)
    if (!next) {
      await setMeta({ lastChecked: now, lastError: null }, domain)
      return { status: 'current' }
    }
    await setMeta({ dataset: next, lastChecked: now, lastError: null }, domain)
    return { status: 'updated', data: next }
  } catch (e) {
    const message = e?.message || String(e)
    await setMeta({ lastChecked: now, lastError: message }, domain).catch(() => {})
    return { status: 'error', message }
  }
}

export async function getDataStatus(domain = 'enterprise') {
  const get = (k) => getMeta(metaKey(k, domain)).catch(() => undefined)
  const dataset = await get('dataset')
  return {
    attackVersion: dataset?.attackVersion ?? null,
    builtAt: dataset?.builtAt ?? null,
    lastChecked: (await get('lastChecked')) ?? null,
    lastError: (await get('lastError')) ?? null,
  }
}
