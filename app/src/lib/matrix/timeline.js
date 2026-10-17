/** Entries that carry a step or a time, in attack order: numbered steps first, then time-only entries. */
export function timelineOf(layer, idx) {
  const rows = Object.entries(layer?.entries ?? {})
    .filter(([id, e]) => idx.byId.has(id) && (e.order != null || e.when))
    .map(([id, entry]) => ({ tech: idx.byId.get(id), entry }))
  const key = (r) => r.entry.order ?? Infinity
  return rows.sort((a, b) => key(a) - key(b) || (a.tech.id < b.tech.id ? -1 : 1))
}
