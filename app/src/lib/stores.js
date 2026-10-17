import { get, writable } from 'svelte/store'
import { indexDataset } from './data/indexDataset.js'
import { ensureDefaultLayer, getActiveLayerId, layerDomain, listLayers, setStoreDomain } from './layers/store.js'
import { loadDataset, checkForUpdate, getDataStatus } from './data/dataset.js'

export const DOMAINS = [['enterprise', 'Enterprise'], ['ics', 'ICS'], ['mobile', 'Mobile']]
const DOMAIN_KEY = 'attack-learner.domain'
const savedDomain = () => {
  try {
    const d = localStorage.getItem(DOMAIN_KEY)
    return DOMAINS.some(([k]) => k === d) ? d : 'enterprise'
  } catch {
    return 'enterprise'
  }
}
/** Which ATT&CK matrix the whole app is showing. */
export const domain = writable(savedDomain())
setStoreDomain(savedDomain())

export const dataset = writable(null)
export const idx = writable(null)
export const dataStatus = writable({ attackVersion: null, builtAt: null, lastChecked: null, lastError: null })
export const layers = writable([])
export const activeLayer = writable(null)
/** Session-only search highlight on the matrix: { label, ids: Set } */
export const highlight = writable(null)
/** One-line message shown above the tab bar; auto-clears. */
export const toast = writable('')
let toastTimer
export function showToast(msg) {
  toast.set(msg)
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.set(''), 3000)
}
export const platformFilter = writable(new Set())

export function setDataset(d) {
  dataset.set(d)
  idx.set(indexDataset(d))
}

/** Re-read layers from storage; call after any layer mutation. */
export async function refreshLayers() {
  const all = (await listLayers()).filter((l) => layerDomain(l) === get(domain))
  layers.set(all)
  const id = getActiveLayerId()
  activeLayer.set(all.find((l) => l.id === id) ?? all[0] ?? null)
}

/** Load a matrix's dataset (cache or bundled), remember the choice, and re-point layers at it. */
export async function switchDomain(d) {
  const { data } = await loadDataset({ domain: d })
  try {
    localStorage.setItem(DOMAIN_KEY, d)
  } catch {
    // storage blocked: Enterprise again next launch
  }
  setStoreDomain(d)
  domain.set(d)
  platformFilter.set(new Set())
  highlight.set(null)
  setDataset(data)
  await ensureDefaultLayer()
  await refreshLayers()
  dataStatus.set(await getDataStatus(d))
  return data
}

/** Daily-check the current matrix for newer data; used at startup and by "Check now". */
export async function updateDomainData({ force = false } = {}) {
  const d = get(domain)
  const r = await checkForUpdate({ current: get(dataset), force, domain: d })
  if (r.status === 'updated') setDataset(r.data)
  dataStatus.set(await getDataStatus(d))
  return r
}
