// Usage: node make-fixture.js <bundle.json> <out.json>
// Cuts a full MITRE Enterprise STIX bundle down to a small test fixture.
import { readFileSync, writeFileSync } from 'node:fs'

const [bundlePath, outPath] = process.argv.slice(2)
const { objects, ...bundle } = JSON.parse(readFileSync(bundlePath, 'utf8'))

const extId = (o) => o.external_references?.[0]?.external_id
const TECHNIQUES = ['T1059', 'T1053', 'T1078', 'T1027', 'T1566', 'T1203', 'T1047']
const OTHERS = ['G0016', 'G0046', 'S0154', 'S0363']
const patterns = objects.filter((o) => o.type === 'attack-pattern')
const rels = objects.filter((o) => o.type === 'relationship')

const keep = new Set()
for (const o of objects) {
  if (o.type === 'x-mitre-collection' || o.type === 'x-mitre-matrix' || o.type === 'x-mitre-tactic') keep.add(o.id)
  if (OTHERS.includes(extId(o))) keep.add(o.id)
}
const parents = patterns.filter((o) => TECHNIQUES.includes(extId(o)))
for (const p of parents) keep.add(p.id)
for (const p of patterns) {
  if (TECHNIQUES.includes(extId(p)?.split('.')[0])) keep.add(p.id) // subtechniques
}
keep.add(patterns.find((o) => o.revoked).id)
keep.add(patterns.find((o) => o.x_mitre_deprecated && !o.revoked).id)

const kept = rels.filter((r) => keep.has(r.source_ref) && keep.has(r.target_ref))
// one relationship pointing at an object that is NOT kept (tests must skip it)
const dangling = rels.find(
  (r) => r.relationship_type === 'uses' && keep.has(r.source_ref) && !keep.has(r.target_ref),
)
writeFileSync(
  outPath,
  JSON.stringify({ ...bundle, objects: [...objects.filter((o) => keep.has(o.id)).map((o) => (o.type === 'x-mitre-collection' ? { ...o, x_mitre_contents: [] } : o)), ...kept, dangling] }, null, 1) + '\n',
)
