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
  const matrix = objs.find((o) => o.type === 'x-mitre-matrix')
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
  const software = [...ofType('malware'), ...ofType('tool')].map((o) => ({
    id: attackId(o),
    name: o.name,
    type: o.type,
    platforms: o.x_mitre_platforms ?? [],
    description: text(o.description),
    techniques: usedBy(o),
  }))

  return { attackVersion: collection.x_mitre_version, builtAt, tactics, techniques, groups, software }
}
