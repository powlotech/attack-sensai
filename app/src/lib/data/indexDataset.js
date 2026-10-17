const byName = (a, b) => a.name.localeCompare(b.name)

/** Build the lookup maps the screens need from a Dataset. */
export function indexDataset(d) {
  const byId = new Map(d.techniques.map((t) => [t.id, t]))
  const childrenOf = new Map()
  const topByTactic = new Map(d.tactics.map((t) => [t.shortname, []]))
  for (const t of d.techniques) {
    if (t.isSub) {
      if (!childrenOf.has(t.parent)) childrenOf.set(t.parent, [])
      childrenOf.get(t.parent).push(t)
    } else {
      for (const s of t.tactics) topByTactic.get(s)?.push(t)
    }
  }
  for (const list of childrenOf.values()) list.sort(byName)
  for (const list of topByTactic.values()) list.sort(byName)

  const usedBy = new Map()
  const slot = (id) => usedBy.get(id) ?? usedBy.set(id, { groups: [], software: [], campaigns: [] }).get(id)
  for (const g of d.groups) for (const id of g.techniques) slot(id).groups.push(g)
  for (const s of d.software) for (const id of s.techniques) slot(id).software.push(s)
  for (const c of d.campaigns ?? []) for (const id of c.techniques) slot(id).campaigns.push(c)

  return {
    byId,
    childrenOf,
    topByTactic,
    groupsById: new Map(d.groups.map((g) => [g.id, g])),
    softwareById: new Map(d.software.map((s) => [s.id, s])),
    campaignsById: new Map((d.campaigns ?? []).map((c) => [c.id, c])),
    usedBy,
  }
}
