import { writable, get } from 'svelte/store'

const KEY = 'bookmarks'
const MAX_RECENT = 10

const empty = () => ({ saved: [], recent: [] })

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return { saved: Array.isArray(s?.saved) ? s.saved : [], recent: Array.isArray(s?.recent) ? s.recent : [] }
  } catch {
    return empty()
  }
}

/** { saved: [{ id, domain, note, at }], recent: [{ id, domain }] }, kept in localStorage. */
export const bookmarks = writable(load())

function update(fn) {
  const next = fn(get(bookmarks))
  bookmarks.set(next)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage blocked: bookmarks last until the app closes
  }
}

const same = (id, domain) => (b) => b.id === id && b.domain === domain

export const isSaved = (s, id, domain) => s.saved.some(same(id, domain))

export const toggleBookmark = (id, domain) =>
  update((s) => ({
    ...s,
    saved: isSaved(s, id, domain) ? s.saved.filter((b) => !same(id, domain)(b)) : [{ id, domain, note: '', at: Date.now() }, ...s.saved],
  }))

export const setBookmarkNote = (id, domain, note) =>
  update((s) => ({ ...s, saved: s.saved.map((b) => (same(id, domain)(b) ? { ...b, note } : b)) }))

export const touchRecent = (id, domain) =>
  update((s) => ({ ...s, recent: [{ id, domain }, ...s.recent.filter((r) => !same(id, domain)(r))].slice(0, MAX_RECENT) }))

export const exportBookmarks = (s) => ({ type: 'attack-sensai-bookmarks', version: 1, saved: s.saved })

/** Merge an exported file in: new bookmarks are added, existing ones keep their note unless theirs is empty. */
export function importBookmarks(json) {
  if ((json?.type !== 'attack-sensai-bookmarks' && json?.type !== 'attack-learner-bookmarks') || !Array.isArray(json.saved)) throw new Error('Not an Attack Sensai bookmarks file')
  const incoming = json.saved.filter((b) => typeof b?.id === 'string' && typeof b?.domain === 'string')
  let added = 0
  update((s) => {
    const saved = [...s.saved]
    for (const b of incoming) {
      const note = typeof b.note === 'string' ? b.note : ''
      const i = saved.findIndex(same(b.id, b.domain))
      if (i < 0) {
        saved.push({ id: b.id, domain: b.domain, note, at: Number(b.at) || Date.now() })
        added++
      } else if (!saved[i].note && note) saved[i] = { ...saved[i], note }
    }
    return { ...s, saved }
  })
  return added
}
