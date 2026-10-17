// Format: Navigator layer v4.5 (see docs/sources.md).
import { isEmptyEntry } from './store.js'

const LAYER_VERSION = '4.5'
const NAVIGATOR_VERSION = '5.2.0'
const DOMAIN_NAMES = {
  enterprise: ['enterprise-attack', 'mitre-enterprise'], // the second is the pre-v4 spelling
  ics: ['ics-attack', 'mitre-ics'],
}
/** 'enterprise' | 'ics' for a Navigator domain string; undefined (a file with no domain) means enterprise, unknown values give null. */
export const domainOfName = (name) =>
  name === undefined ? 'enterprise' : (Object.keys(DOMAIN_NAMES).find((k) => DOMAIN_NAMES[k].includes(name)) ?? null)
const SCORE_COLOURS = ['#FCE7C8', '#F6B76B', '#E07A2E', '#9A3F0E'] // light palette, scores 1-4

export class LayerImportError extends Error {
  /** @param {string} field the layer field that was wrong, so the UI can name it */
  constructor(message, field) {
    super(message)
    this.name = 'LayerImportError'
    this.field = field
  }
}

const metadataFor = (e) => {
  const metadata = [
    ...(e.learned ? [{ name: 'learned', value: 'true' }] : []),
    ...(e.order != null ? [{ name: 'order', value: String(e.order) }] : []),
    ...(e.when ? [{ name: 'when', value: e.when }] : []),
  ]
  return metadata.length ? { metadata } : {}
}
const metaValue = (t, name) => t.metadata?.find?.((m) => m?.name === name)?.value

/** @param {import('./store.js').Layer} layer */
export function toNavigatorLayer(layer, { attackVersion }) {
  return {
    name: layer.name,
    domain: DOMAIN_NAMES[layer.domain ?? 'enterprise'][0],
    versions: { attack: String(attackVersion), navigator: NAVIGATOR_VERSION, layer: LAYER_VERSION },
    techniques: Object.entries(layer.entries).map(([techniqueID, e]) => ({
      techniqueID,
      score: e.score,
      comment: e.comment,
      enabled: true,
      ...metadataFor(e),
    })),
    gradient: { colors: [SCORE_COLOURS[0], SCORE_COLOURS[3]], minValue: 0, maxValue: 4 },
    legendItems: SCORE_COLOURS.map((color, i) => ({ label: `Score ${i + 1}`, color })),
  }
}

const clamp = (n) => Math.min(4, Math.max(0, Math.round(n)))

/**
 * Read a Navigator layer. Throws LayerImportError (naming the field) instead of returning a partial layer.
 * @returns {{name: string, domain: 'enterprise'|'ics', entries: Record<string, import('./store.js').Entry>, unknownCount: number}}
 */
export function fromNavigatorLayer(json, { knownIds }) {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw new LayerImportError('This file is not a Navigator layer (expected a JSON object).', 'layer')
  }
  if (!Array.isArray(json.techniques)) {
    throw new LayerImportError('This file has no "techniques" list, so it is not a Navigator layer.', 'techniques')
  }
  const domain = domainOfName(json.domain)
  if (!domain) {
    throw new LayerImportError(`Only Enterprise and ICS layers are supported; this one has domain "${json.domain}".`, 'domain')
  }

  const entries = {}
  const unknown = new Set()
  for (const t of json.techniques) {
    const id = t?.techniqueID
    if (typeof id !== 'string') continue
    if (!knownIds.has(id)) {
      unknown.add(id)
      continue
    }
    const score = Number.isFinite(t.score) ? clamp(t.score) : 0
    const comment = typeof t.comment === 'string' ? t.comment : ''
    const learned = !!t.metadata?.some?.((m) => m?.name === 'learned' && m.value === 'true')
    const step = Math.round(Number(metaValue(t, 'order')))
    const when = String(metaValue(t, 'when') ?? '').trim()
    const prev = entries[id]
    const merged = prev
      ? {
          score: Math.max(prev.score, score),
          comment: [prev.comment, comment].filter(Boolean).join('\n'),
          learned: prev.learned || learned,
          order: prev.order ?? (step >= 1 ? step : undefined),
          when: prev.when || when,
        }
      : { score, comment, learned, order: step >= 1 ? step : undefined, when }
    if (merged.order === undefined) delete merged.order
    if (!merged.when) delete merged.when
    entries[id] = merged
  }
  for (const id of Object.keys(entries)) if (isEmptyEntry(entries[id])) delete entries[id]
  return { name: typeof json.name === 'string' && json.name ? json.name : 'Imported layer', domain, entries, unknownCount: unknown.size }
}

export const exportFileName = (layer) =>
  `${layer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'layer'}.layer.json`
