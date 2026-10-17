import { writable } from 'svelte/store'
import { indexDataset } from './data/indexDataset.js'
import { getActiveLayerId, listLayers } from './layers/store.js'

export const dataset = writable(null)
export const idx = writable(null)
export const dataStatus = writable({ attackVersion: null, builtAt: null, lastChecked: null, lastError: null })
export const layers = writable([])
export const activeLayer = writable(null)
/** Session-only search highlight on the matrix: { label, ids: Set } */
export const highlight = writable(null)
export const platformFilter = writable(new Set())

export function setDataset(d) {
  dataset.set(d)
  idx.set(indexDataset(d))
}

/** Re-read layers from storage; call after any layer mutation. */
export async function refreshLayers() {
  const all = await listLayers()
  layers.set(all)
  const id = getActiveLayerId()
  activeLayer.set(all.find((l) => l.id === id) ?? all[0] ?? null)
}
