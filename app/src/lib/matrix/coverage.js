// Learned/total per tactic. Sub-techniques count under their parent's tactics.
export function coverage(dataset, entries) {
  const byId = new Map(dataset.techniques.map((t) => [t.id, t]))
  const rows = dataset.tactics.map((t) => ({ tactic: t, learned: 0, total: 0, next: [] }))
  const row = new Map(rows.map((r) => [r.tactic.shortname, r]))
  for (const t of dataset.techniques) {
    const learned = !!entries?.[t.id]?.learned
    for (const s of (t.isSub ? byId.get(t.parent)?.tactics : t.tactics) ?? []) {
      const r = row.get(s)
      if (!r) continue
      r.total++
      if (learned) r.learned++
      else if (!t.isSub) r.next.push(t)
    }
  }
  return rows
}

// ponytail: "next" = first few unlearned top-level techniques of the least-covered tactic; smarter ranking if wanted
export function nextToLearn(rows, n = 5) {
  const open = rows.filter((r) => r.next.length)
  if (!open.length) return []
  const weakest = open.reduce((a, b) => (b.learned / b.total < a.learned / a.total ? b : a))
  return weakest.next.slice(0, n)
}
