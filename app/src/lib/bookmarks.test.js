import { beforeEach, expect, test } from 'vitest'
import { get } from 'svelte/store'
import { bookmarks, toggleBookmark, setBookmarkNote, touchRecent, exportBookmarks, importBookmarks } from './bookmarks.js'

beforeEach(() => {
  localStorage.clear()
  bookmarks.set({ saved: [], recent: [] })
})

test('toggle adds then removes, per domain', () => {
  toggleBookmark('T1059', 'enterprise')
  toggleBookmark('T1059', 'ics')
  expect(get(bookmarks).saved).toHaveLength(2)
  toggleBookmark('T1059', 'enterprise')
  expect(get(bookmarks).saved.map((b) => b.domain)).toEqual(['ics'])
})

test('note is saved and persisted', () => {
  toggleBookmark('T1', 'enterprise')
  setBookmarkNote('T1', 'enterprise', 'revisit')
  expect(get(bookmarks).saved[0].note).toBe('revisit')
  expect(JSON.parse(localStorage.getItem('bookmarks')).saved[0].note).toBe('revisit')
})

test('recents dedupe and cap at 10', () => {
  for (let i = 0; i < 12; i++) touchRecent('T' + i, 'enterprise')
  touchRecent('T5', 'enterprise')
  const r = get(bookmarks).recent
  expect(r).toHaveLength(10)
  expect(r[0].id).toBe('T5')
  expect(r.filter((x) => x.id === 'T5')).toHaveLength(1)
})

test('export then import merges and rejects junk', () => {
  toggleBookmark('T1', 'enterprise')
  setBookmarkNote('T1', 'enterprise', 'note')
  const file = exportBookmarks(get(bookmarks))
  bookmarks.set({ saved: [], recent: [] })
  expect(importBookmarks(file)).toBe(1)
  expect(importBookmarks(file)).toBe(0)
  expect(get(bookmarks).saved[0].note).toBe('note')
  expect(() => importBookmarks({ saved: [] })).toThrow()
})
