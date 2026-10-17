const KINDS = ['techniques', 'groups', 'software']
// fields that count as "changed"; other edits (relationships, urls) are too noisy
const FIELDS = ['name', 'description', 'tactics']

/** Compare two datasets by id. Objects missing from `next` are deprecated or revoked upstream (the build drops them). */
export function diffDatasets(old, next) {
  const out = { from: old.attackVersion, to: next.attackVersion }
  for (const kind of KINDS) {
    const before = new Map((old[kind] ?? []).map((o) => [o.id, o]))
    const after = new Map((next[kind] ?? []).map((o) => [o.id, o]))
    const ref = (o) => ({ id: o.id, name: o.name })
    out[kind] = {
      added: [...after.values()].filter((o) => !before.has(o.id)).map(ref),
      removed: [...before.values()].filter((o) => !after.has(o.id)).map(ref),
      changed: [...after.values()]
        .filter((o) => before.has(o.id) && FIELDS.some((f) => JSON.stringify(o[f]) !== JSON.stringify(before.get(o.id)[f])))
        .map(ref),
    }
  }
  return out
}
