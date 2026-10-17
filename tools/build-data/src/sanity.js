const MAX_BYTES = 4 * 1024 * 1024

/** @returns {string[]} problems; empty means the dataset is fine to publish. */
export function sanityCheck(d, { minTechniques = 100 } = {}) {
  const problems = []
  if (d.techniques.length < minTechniques) problems.push(`only ${d.techniques.length} techniques (need ${minTechniques})`)
  if (d.tactics.length === 0) problems.push('0 tactics')
  if (d.groups.length === 0) problems.push('0 groups')
  const known = new Set(d.tactics.map((t) => t.shortname))
  for (const t of d.techniques) {
    for (const s of t.tactics) if (!known.has(s)) problems.push(`technique ${t.id} has unknown tactic "${s}"`)
  }
  const bytes = Buffer.byteLength(JSON.stringify(d))
  if (bytes > MAX_BYTES) problems.push(`attack.json is ${bytes} bytes (max ${MAX_BYTES})`)
  return problems
}
