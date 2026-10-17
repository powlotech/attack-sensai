import { openDb } from '../data/db.js'

/** @typedef {{score: number, comment: string, learned: boolean, order?: number, when?: string}} Entry */
/** @typedef {{id: string, name: string, domain?: 'enterprise'|'ics'|'mobile', createdAt: number, updatedAt: number, entries: Record<string, Entry>}} Layer */

/** An entry with nothing worth keeping; `order` is the step in an incident, `when` free-text timing. */
export const isEmptyEntry = (e) => e.score === 0 && e.comment === '' && !e.learned && e.order == null && !e.when

const EMPTY = { score: 0, comment: '', learned: false }
const ACTIVE_KEY = 'attack-learner.activeLayer' // enterprise; other domains append ':<domain>'

/** Layers saved before domains existed have none: they are Enterprise. */
export const layerDomain = (l) => l.domain ?? 'enterprise'
// ponytail: module-level current domain keeps callers of create/ensureDefault/active-id unchanged; the app sets it on every domain switch.
let current = 'enterprise'
export const setStoreDomain = (d) => (current = d)
const activeKey = () => (current === 'enterprise' ? ACTIVE_KEY : `${ACTIVE_KEY}:${current}`)

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

export const createLayer = (name, entries = {}, domain = current) =>
  serial(async () => {
    const layer = { id: crypto.randomUUID(), name, domain, createdAt: now(), updatedAt: now(), entries }
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

/** Combine two entries: higher score, learned if either, both comments, first layer's order/when win. */
export function mergeEntries(a, b) {
  if (!a || !b) return structuredClone(a ?? b)
  const out = { ...EMPTY, ...b, ...a, score: Math.max(a.score, b.score), learned: !!(a.learned || b.learned) }
  out.comment = a.comment === b.comment ? a.comment : [a.comment, b.comment].filter(Boolean).join('\n')
  if (a.order == null && b.order != null) out.order = b.order
  if (!a.when && b.when) out.when = b.when
  return structuredClone(out)
}

/** Merge two layers of the same domain into a new layer; both originals are left untouched. */
export const mergeLayers = (idA, idB) =>
  serial(async () => {
    const [a, b] = [await getLayer(idA), await getLayer(idB)]
    if (!a || !b) throw new Error('No such layer')
    if (layerDomain(a) !== layerDomain(b)) throw new Error('Layers are in different matrices')
    const entries = {}
    for (const id of new Set([...Object.keys(a.entries), ...Object.keys(b.entries)])) entries[id] = mergeEntries(a.entries[id], b.entries[id])
    const layer = { id: crypto.randomUUID(), name: `${a.name} + ${b.name}`, domain: layerDomain(a), createdAt: now(), updatedAt: now(), entries }
    await write(layer)
    return layer
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
    const step = Math.round(merged.order)
    if (step >= 1) merged.order = step
    else delete merged.order
    merged.when = (merged.when ?? '').trim()
    if (!merged.when) delete merged.when
    const entries = { ...layer.entries }
    if (isEmptyEntry(merged)) delete entries[techId]
    else entries[techId] = merged
    const next = { ...layer, entries, updatedAt: now() }
    await write(next)
    return next
  })

export const ensureDefaultLayer = () =>
  serial(async () => {
    const mine = (await listLayers()).filter((l) => layerDomain(l) === current)
    if (mine.length) return mine[0]
    const layer = { id: crypto.randomUUID(), name: 'Learning progress', domain: current, createdAt: now(), updatedAt: now(), entries: {} }
    await write(layer)
    return layer
  })

export function getActiveLayerId() {
  try {
    return localStorage.getItem(activeKey())
  } catch {
    return null
  }
}

export function setActiveLayerId(id) {
  try {
    localStorage.setItem(activeKey(), id)
  } catch {
    // storage blocked: active layer falls back to the first layer next launch
  }
}

/** Entries whose technique is no longer in the dataset (revoked or renamed by MITRE). */
export const orphanCount = (layer, idx) => Object.keys(layer.entries).filter((id) => !idx.byId.has(id)).length
