// Usage: node cli.js --out <dir>   (downloads the latest Enterprise and ICS bundles, writes attack.json/version.json and ics.json/ics-version.json)
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { sanityCheck } from './sanity.js'
import { transform } from './transform.js'

const INDEX_URL = 'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/index.json'

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.json()
}

const DOMAINS = [
  { name: 'Enterprise ATT&CK', file: 'attack.json', versionFile: 'version.json', minTechniques: 100 },
  { name: 'ICS ATT&CK', file: 'ics.json', versionFile: 'ics-version.json', minTechniques: 50 },
  { name: 'Mobile ATT&CK', file: 'mobile.json', versionFile: 'mobile-version.json', minTechniques: 50 },
]

async function build(index, out, { name, file, versionFile, minTechniques }) {
  const enterprise = index.collections.find((c) => c.name === name)
  if (!enterprise) throw new Error(`${name} collection not found in index.json`)
  const latest = [...enterprise.versions].sort((a, b) => b.modified.localeCompare(a.modified))[0]

  const bundle = await getJson(latest.url)
  // builtAt is inside attack.json, so a fresh timestamp would change the sha every run:
  // rebuild with the previous builtAt first and stop if that is byte-identical.
  const prevPath = join(out, versionFile)
  const prev = existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, 'utf8')) : null
  const sha = (text) => createHash('sha256').update(text).digest('hex')
  if (prev && sha(JSON.stringify(transform(bundle, { builtAt: prev.builtAt }))) === prev.sha256) {
    console.log(`${name} ${prev.attackVersion}: unchanged, nothing written`)
    return
  }

  const dataset = transform(bundle, { builtAt: new Date().toISOString() })
  const problems = sanityCheck(dataset, { minTechniques })
  if (problems.length) {
    console.error('Sanity check failed, nothing written:\n- ' + problems.join('\n- '))
    process.exit(1)
  }

  const body = JSON.stringify(dataset)
  const version = {
    attackVersion: dataset.attackVersion,
    builtAt: dataset.builtAt,
    sha256: sha(body),
    bytes: Buffer.byteLength(body),
  }
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, file), body)
  writeFileSync(join(out, versionFile), JSON.stringify(version) + '\n')
  console.log(`${name} ${version.attackVersion}: ${file} ${(version.bytes / 1024 / 1024).toFixed(2)} MB`)
}

async function main() {
  const out = process.argv[process.argv.indexOf('--out') + 1]
  if (!out || out.startsWith('--')) throw new Error('usage: cli.js --out <dir>')
  const index = await getJson(INDEX_URL)
  for (const d of DOMAINS) await build(index, out, d)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
