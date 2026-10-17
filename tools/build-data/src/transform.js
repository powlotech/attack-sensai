import { stripCitations } from './stripCitations.js'

const ATTACK_URL = 'https://attack.mitre.org'
const alive = (o) => !o.revoked && !o.x_mitre_deprecated
const ref = (o) => o.external_references?.find((r) => r.source_name === 'mitre-attack')
const attackId = (o) => ref(o)?.external_id
const text = (s) => stripCitations(s ?? '')

/**
 * Turn a MITRE Enterprise STIX bundle into the compact attack.json dataset (spec §4).
 * @param {{objects: object[]}} bundle
 * @param {{builtAt: string}} opts
 */
export function transform(bundle, { builtAt }) {
  const objs = bundle.objects
  const ofType = (type) => objs.filter((o) => o.type === type && alive(o))
  const idOf = new Map(objs.filter(attackId).map((o) => [o.id, attackId(o)]))

  const collection = objs.find((o) => o.type === 'x-mitre-collection')
  // Mobile bundles also ship a small "Network-Based Effects" matrix; the main one has the most tactics.
  const matrix = objs.filter((o) => o.type === 'x-mitre-matrix').sort((x, y) => y.tactic_refs.length - x.tactic_refs.length)[0]
  const tacticByStix = new Map(ofType('x-mitre-tactic').map((o) => [o.id, o]))
  const tactics = matrix.tactic_refs
    .map((id) => tacticByStix.get(id))
    .filter(Boolean)
    .map((o) => ({ id: attackId(o), shortname: o.x_mitre_shortname, name: o.name, description: text(o.description) }))

  const techniqueIds = new Set()
  const techniques = ofType('attack-pattern').map((o) => {
    const id = attackId(o)
    techniqueIds.add(id)
    const isSub = !!o.x_mitre_is_subtechnique
    return {
      id,
      name: o.name,
      parent: isSub ? id.split('.')[0] : null,
      isSub,
      tactics: (o.kill_chain_phases ?? []).filter((k) => k.kill_chain_name.startsWith('mitre-')).map((k) => k.phase_name),
      platforms: o.x_mitre_platforms ?? [],
      description: text(o.description),
      url: `${ATTACK_URL}/techniques/${id.replace('.', '/')}/`,
    }
  })

  // source STIX id -> technique ids it uses; relationships to dropped objects fall out here
  const uses = new Map()
  for (const r of objs) {
    if (r.type !== 'relationship' || r.relationship_type !== 'uses' || !alive(r)) continue
    const target = idOf.get(r.target_ref)
    if (!target || !techniqueIds.has(target)) continue
    if (!uses.has(r.source_ref)) uses.set(r.source_ref, [])
    uses.get(r.source_ref).push(target)
  }
  const usedBy = (o) => [...new Set(uses.get(o.id) ?? [])].sort()

  const groups = ofType('intrusion-set').map((o) => ({
    id: attackId(o),
    name: o.name,
    aliases: (o.aliases ?? []).filter((a) => a !== o.name),
    description: text(o.description),
    techniques: usedBy(o),
  }))
  // attributed-to: campaign -> group
  const groupsOf = new Map()
  for (const r of objs) {
    if (r.type !== 'relationship' || r.relationship_type !== 'attributed-to' || !alive(r)) continue
    const g = idOf.get(r.target_ref)
    if (!g || !idOf.has(r.source_ref)) continue
    if (!groupsOf.has(r.source_ref)) groupsOf.set(r.source_ref, [])
    groupsOf.get(r.source_ref).push(g)
  }
  const campaigns = ofType('campaign').map((o) => ({
    id: attackId(o),
    name: o.name,
    aliases: (o.aliases ?? []).filter((a) => a !== o.name),
    description: text(o.description),
    firstSeen: o.first_seen?.slice(0, 7) ?? null,
    lastSeen: o.last_seen?.slice(0, 7) ?? null,
    groups: [...new Set(groupsOf.get(o.id) ?? [])].sort(),
    techniques: usedBy(o),
  }))
  const software = [...ofType('malware'), ...ofType('tool')].map((o) => ({
    id: attackId(o),
    name: o.name,
    type: o.type,
    platforms: o.x_mitre_platforms ?? [],
    description: text(o.description),
    techniques: usedBy(o),
  }))

  // course-of-action -> technique, with the per-technique note on how it mitigates
  const mitigated = new Map()
  for (const r of objs) {
    if (r.type !== 'relationship' || r.relationship_type !== 'mitigates' || !alive(r)) continue
    const target = idOf.get(r.target_ref)
    if (!target || !techniqueIds.has(target)) continue
    if (!mitigated.has(r.source_ref)) mitigated.set(r.source_ref, new Map())
    mitigated.get(r.source_ref).set(target, text(r.description))
  }
  const mitigations = ofType('course-of-action')
    .filter((o) => attackId(o))
    .map((o) => ({
      id: attackId(o),
      name: o.name,
      description: text(o.description),
      techniques: [...(mitigated.get(o.id) ?? [])].map(([id, how]) => ({ id, how })).sort((a, b) => a.id.localeCompare(b.id)),
    }))

  // detection strategy -> technique; data components come from the strategy's analytics (ATT&CK v18+ model, absent in older bundles)
  const byStix = new Map(objs.map((o) => [o.id, o]))
  const detected = new Map()
  for (const r of objs) {
    if (r.type !== 'relationship' || r.relationship_type !== 'detects' || !alive(r)) continue
    const target = idOf.get(r.target_ref)
    if (!target || !techniqueIds.has(target)) continue
    if (!detected.has(r.source_ref)) detected.set(r.source_ref, [])
    detected.get(r.source_ref).push(target)
  }
  const detections = ofType('x-mitre-detection-strategy')
    .filter((o) => attackId(o))
    .map((o) => {
      const comps = (o.x_mitre_analytic_refs ?? []).flatMap((a) =>
        (byStix.get(a)?.x_mitre_log_source_references ?? []).map((l) => byStix.get(l.x_mitre_data_component_ref)?.name),
      )
      return {
        id: attackId(o),
        name: o.name,
        dataComponents: [...new Set(comps.filter(Boolean))].sort(),
        techniques: [...new Set(detected.get(o.id) ?? [])].sort(),
      }
    })

  return { attackVersion: collection.x_mitre_version, builtAt, tactics, techniques, groups, software, campaigns, mitigations, detections }
}
