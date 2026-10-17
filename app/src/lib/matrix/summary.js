// Two letters per tactic for the overview grid; the 15 current ATT&CK tactics are listed so none collide.
const ABBR = {
  reconnaissance: 'RE',
  'resource-development': 'RD',
  'initial-access': 'IA',
  execution: 'EX',
  persistence: 'PE',
  'privilege-escalation': 'PR',
  stealth: 'ST',
  'defense-impairment': 'DF',
  'credential-access': 'CA',
  discovery: 'DI',
  'lateral-movement': 'LM',
  collection: 'CO',
  'command-and-control': 'C2',
  exfiltration: 'EF',
  impact: 'IM',
  // ICS-only tactics
  evasion: 'EV',
  'inhibit-response-function': 'IR',
  'impair-process-control': 'IP',
}
export const tacticAbbr = (shortname) => ABBR[shortname] ?? shortname.slice(0, 2).toUpperCase()

export const effectiveScore = (layer, techId) => layer?.entries[techId]?.score ?? 0

/** A top-level technique's own score or its highest sub-technique score; used by the overview. */
export const rolledScore = (idx, layer, techId) =>
  Math.max(effectiveScore(layer, techId), ...(idx.childrenOf.get(techId) ?? []).map((c) => effectiveScore(layer, c.id)))

/** Top-level techniques only; one counts as scored when it or any sub-technique scores above 0. */
export function tacticSummary(idx, layer, shortname) {
  const list = idx.topByTactic.get(shortname) ?? []
  return { scored: list.filter((t) => rolledScore(idx, layer, t.id) > 0).length, total: list.length }
}
