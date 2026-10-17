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
}
export const tacticAbbr = (shortname) => ABBR[shortname] ?? shortname.slice(0, 2).toUpperCase()

export const effectiveScore = (layer, techId) => layer?.entries[techId]?.score ?? 0

/** Top-level techniques only; a technique counts as scored when its score is above 0. */
export function tacticSummary(idx, layer, shortname) {
  const list = idx.topByTactic.get(shortname) ?? []
  return { scored: list.filter((t) => effectiveScore(layer, t.id) > 0).length, total: list.length }
}
