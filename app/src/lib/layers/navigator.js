// Format: Navigator layer v4.5 (see docs/sources.md).
const LAYER_VERSION = '4.5'
const NAVIGATOR_VERSION = '5.2.0'
const ENTERPRISE_DOMAINS = ['enterprise-attack', 'mitre-enterprise'] // the second is the pre-v4 spelling
const SCORE_COLOURS = ['#FCE7C8', '#F6B76B', '#E07A2E', '#9A3F0E'] // light palette, scores 1-4

export class LayerImportError extends Error {
  /** @param {string} field the layer field that was wrong, so the UI can name it */
  constructor(message, field) {
    super(message)
    this.name = 'LayerImportError'
    this.field = field
  }
}

/** @param {import('./store.js').Layer} layer */
export function toNavigatorLayer(layer, { attackVersion }) {
  return {
    name: layer.name,
    domain: 'enterprise-attack',
    versions: { attack: String(attackVersion), navigator: NAVIGATOR_VERSION, layer: LAYER_VERSION },
    techniques: Object.entries(layer.entries).map(([techniqueID, e]) => ({
      techniqueID,
      score: e.score,
      comment: e.comment,
      enabled: true,
      ...(e.learned && { metadata: [{ name: 'learned', value: 'true' }] }),
    })),
    gradient: { colors: [SCORE_COLOURS[0], SCORE_COLOURS[3]], minValue: 0, maxValue: 4 },
    legendItems: SCORE_COLOURS.map((color, i) => ({ label: `Score ${i + 1}`, color })),
  }
}

const clamp = (n) => Math.min(4, Math.max(0, Math.round(n)))

/**
 * Read a Navigator layer. Throws LayerImportError (naming the field) instead of returning a partial layer.
 * @returns {{name: string, entries: Record<string, import('./store.js').Entry>, unknownCount: number}}
 */
export function fromNavigatorLayer(json, { knownIds }) {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw new LayerImportError('This file is not a Navigator layer (expected a JSON object).', 'layer')
  }
  if (!Array.isArray(json.techniques)) {
    throw new LayerImportError('This file has no "techniques" list, so it is not a Navigator layer.', 'techniques')
  }
  if (json.domain !== undefined && !ENTERPRISE_DOMAINS.includes(json.domain)) {
    throw new LayerImportError(`Only Enterprise layers are supported; this one has domain "${json.domain}".`, 'domain')
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
    const prev = entries[id]
    entries[id] = prev
      ? {
          score: Math.max(prev.score, score),
          comment: [prev.comment, comment].filter(Boolean).join('\n'),
          learned: prev.learned || learned,
        }
      : { score, comment, learned }
  }
  for (const id of Object.keys(entries)) {
    const e = entries[id]
    if (e.score === 0 && !e.comment && !e.learned) delete entries[id]
  }
  return { name: typeof json.name === 'string' && json.name ? json.name : 'Imported layer', entries, unknownCount: unknown.size }
}

export const exportFileName = (layer) =>
  `${layer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'layer'}.layer.json`
