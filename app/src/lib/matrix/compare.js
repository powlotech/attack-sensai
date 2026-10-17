/** Reference vs mine: every scored reference technique is a gap (mine 0), weak (mine 1) or covered (mine ≥ 2). */
export function compareLayers(ref, mine, idx, allowed = null) {
  const ok = (id) => idx.byId.has(id) && (!allowed || allowed.has(id))
  const score = (l, id) => l?.entries?.[id]?.score ?? 0
  const out = { gaps: [], weak: [], covered: [], extra: [], total: 0 }
  for (const [id, e] of Object.entries(ref?.entries ?? {})) {
    if (e.score <= 0 || !ok(id)) continue
    const m = score(mine, id)
    const row = { id, tech: idx.byId.get(id), ref: e.score, mine: m, order: e.order }
    out[m === 0 ? 'gaps' : m === 1 ? 'weak' : 'covered'].push(row)
    out.total++
  }
  const key = (r) => r.order ?? Infinity
  for (const k of ['gaps', 'weak', 'covered']) out[k].sort((a, b) => key(a) - key(b) || (a.id < b.id ? -1 : 1))
  for (const [id, e] of Object.entries(mine?.entries ?? {}))
    if (e.score > 0 && ok(id) && score(ref, id) === 0) out.extra.push({ id, tech: idx.byId.get(id), ref: 0, mine: e.score })
  out.extra.sort((a, b) => (a.id < b.id ? -1 : 1))
  return out
}
