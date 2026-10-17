import { PLATFORM_GROUPS } from './platforms.js'

const LIMIT = 50
const MAX_QUERY = 200 // longer input is never a real query; keeps scans cheap

/** 't1059.001', '1059.001', 'T1059/001', 'T1059 001' -> 'T1059.001'; null when not an ID. */
export function normaliseTechniqueId(q) {
  const m = /^t?(\d{4})(?:[./\s]+(\d{3}))?$/i.exec(q.trim())
  return m ? `T${m[1]}${m[2] ? '.' + m[2] : ''}` : null
}

export function techniquesForPlatforms(idx, platforms) {
  const wanted = new Set(
    PLATFORM_GROUPS.filter((g) => platforms.has(g.key)).flatMap((g) => g.members),
  )
  const ids = new Set()
  for (const t of idx.byId.values()) if (t.platforms?.some((p) => wanted.has(p))) ids.add(t.id)
  return ids
}

export function buildSearchIndex(idx) {
  const entry = (o, aliases = []) => ({
    item: o,
    id: o.id.toLowerCase(),
    name: o.name.toLowerCase(),
    aliases: aliases.map((a) => a.toLowerCase()),
    desc: (o.description ?? '').toLowerCase(),
  })
  return {
    idx,
    techniques: [...idx.byId.values()].map((t) => entry(t)),
    groups: [...idx.groupsById.values()].map((g) => entry(g, g.aliases)),
    software: [...idx.softwareById.values()].map((s) => entry(s, s.aliases)),
    campaigns: [...idx.campaignsById.values()].map((c) => entry(c, c.aliases)),
  }
}

/** Rank: 0 exact ID, 1 name prefix, 2 name substring, 3 alias, 4 description word. Lower is better. */
function rank(e, q, normId) {
  if (e.id === q || e.id === normId?.toLowerCase()) return 0
  if (e.name.startsWith(q)) return 1
  if (e.name.includes(q)) return 2
  if (e.aliases.some((a) => a.includes(q))) return 3
  if (e.desc.includes(q)) return 4
  return -1
}

export function search(si, query, { kind, platforms } = {}) {
  const q = String(query ?? '').trim().toLowerCase().slice(0, MAX_QUERY)
  if (!q) return []
  const normId = normaliseTechniqueId(q)
  const allowed = kind === 'techniques' && platforms?.size ? techniquesForPlatforms(si.idx, platforms) : null
  const out = []
  for (const e of si[kind] ?? []) {
    if (allowed && !allowed.has(e.item.id)) continue
    const r = rank(e, q, normId)
    if (r >= 0) out.push({ r, name: e.name, item: e.item })
  }
  out.sort((a, b) => a.r - b.r || a.name.localeCompare(b.name))
  return out.slice(0, LIMIT).map((x) => x.item)
}
