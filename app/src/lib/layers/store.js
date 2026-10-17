import { openDb } from '../data/db.js'

/** @typedef {{score: number, comment: string, learned: boolean}} Entry */
/** @typedef {{id: string, name: string, createdAt: number, updatedAt: number, entries: Record<string, Entry>}} Layer */

const EMPTY = { score: 0, comment: '', learned: false }
const ACTIVE_KEY = 'attack-learner.activeLayer'

// ponytail: IndexedDB failure means layers live in this Map and vanish on reload; isPersistent() lets the UI warn.
const memory = new Map()
let useMemory = false

async function db() {
  if (useMemory) return null
  try {
    return await openDb()
  } catch {
    useMemory = true
    return null
  }
}

async function readAll() {
  const d = await db()
  if (!d) return [...memory.values()]
  try {
    return await d.getAll('layers')
  } finally {
    d.close()
  }
}

async function write(layer) {
  const d = await db()
  if (!d) return void memory.set(layer.id, layer)
  try {
    await d.put('layers', layer)
  } finally {
    d.close()
  }
}

// Mutations run one at a time so two quick edits can't overwrite each other.
let queue = Promise.resolve()
const serial = (fn) => (queue = queue.then(fn, fn))

const now = () => Date.now()
const clampScore = (n) => Math.min(4, Math.max(0, Math.round(Number(n)) || 0))

export const isPersistent = async () => {
  ;(await db())?.close()
  return !useMemory
}

export const listLayers = async () => (await readAll()).sort((a, b) => a.createdAt - b.createdAt)
export const getLayer = async (id) => (await readAll()).find((l) => l.id === id)

export const createLayer = (name, entries = {}) =>
  serial(async () => {
    const layer = { id: crypto.randomUUID(), name, createdAt: now(), updatedAt: now(), entries }
    await write(layer)
    return layer
  })

export const renameLayer = (id, name) =>
  serial(async () => {
    const layer = await getLayer(id)
    if (!layer) return undefined
    const next = { ...layer, name, updatedAt: now() }
    await write(next)
    return next
  })

export const duplicateLayer = (id) =>
  serial(async () => {
    const layer = await getLayer(id)
    if (!layer) return undefined
    const copy = structuredClone({ ...layer, id: crypto.randomUUID(), name: `${layer.name} (copy)`, createdAt: now(), updatedAt: now() })
    await write(copy)
    return copy
  })

export const deleteLayer = (id) =>
  serial(async () => {
    const d = await db()
    if (!d) return void memory.delete(id)
    try {
      await d.delete('layers', id)
    } finally {
      d.close()
    }
  })

/** Merge a patch into one entry. An entry back at its defaults is removed; unknown technique ids are kept. */
export const setEntry = (layerId, techId, patch) =>
  serial(async () => {
    const layer = await getLayer(layerId)
    if (!layer) throw new Error(`No such layer: ${layerId}`)
    const merged = { ...EMPTY, ...layer.entries[techId], ...patch }
    merged.score = clampScore(merged.score)
    const entries = { ...layer.entries }
    if (merged.score === 0 && merged.comment === '' && !merged.learned) delete entries[techId]
    else entries[techId] = merged
    const next = { ...layer, entries, updatedAt: now() }
    await write(next)
    return next
  })

export const ensureDefaultLayer = () =>
  serial(async () => {
    const all = await listLayers()
    if (all.length) return all[0]
    const layer = { id: crypto.randomUUID(), name: 'Learning progress', createdAt: now(), updatedAt: now(), entries: {} }
    await write(layer)
    return layer
  })

export function getActiveLayerId() {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function setActiveLayerId(id) {
  try {
    localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    // storage blocked: active layer falls back to the first layer next launch
  }
}

/** Entries whose technique is no longer in the dataset (revoked or renamed by MITRE). */
export const orphanCount = (layer, idx) => Object.keys(layer.entries).filter((id) => !idx.byId.has(id)).length
