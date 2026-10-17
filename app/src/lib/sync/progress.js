import { listLayers, upsertLayer } from '../layers/store.js'
import { bookmarks, exportBookmarks, importBookmarks } from '../bookmarks.js'
import { get } from 'svelte/store'

const TYPE = 'attack-sensai-progress'

/** Everything worth carrying to another device: all layers (with learned ticks) and bookmarks. */
export async function exportProgress() {
  return { type: TYPE, version: 1, exportedAt: Date.now(), layers: await listLayers(), saved: exportBookmarks(get(bookmarks)).saved }
}

/** Merge a progress file in. Nothing is overwritten: scores take the higher value, learned ticks stick, comments are joined. */
export async function importProgress(json) {
  if ((json?.type !== TYPE && json?.type !== 'attack-learner-progress') || !Array.isArray(json.layers)) throw new Error('Not an Attack Sensai progress file')
  let layers = 0
  for (const l of json.layers) {
    if (typeof l?.id === 'string' && typeof l.name === 'string' && l.entries && typeof l.entries === 'object') {
      await upsertLayer(l)
      layers++
    }
  }
  const bm = Array.isArray(json.saved) ? importBookmarks({ type: 'attack-sensai-bookmarks', saved: json.saved }) : 0
  return { layers, bookmarks: bm }
}
