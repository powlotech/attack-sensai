import { timelineOf } from '../matrix/timeline.js'
import { isEmptyEntry } from './store.js'

const q = (s) => `"${String(s).replaceAll('"', '""')}"`

/** One row per technique the layer has anything on. */
export function layerCsv(layer, idx) {
  const rows = Object.entries(layer.entries)
    .filter(([id, e]) => idx.byId.has(id) && !isEmptyEntry(e))
    .map(([id, e]) => [id, idx.byId.get(id).name, (idx.byId.get(id).tactics ?? []).join(' '), e.score, e.learned ? 'yes' : 'no', e.comment])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
  return [['id', 'name', 'tactics', 'score', 'learned', 'comment'], ...rows].map((r) => r.map(q).join(',')).join('\n') + '\n'
}

/** The incident timeline as Markdown: numbered steps, then time-only entries. */
export function timelineMarkdown(layer, idx) {
  const lines = timelineOf(layer, idx).map(({ tech, entry }, i) => {
    const when = entry.when ? ` (${entry.when})` : ''
    const note = entry.comment ? ` - ${entry.comment.replaceAll('\n', ' ')}` : ''
    return `${entry.order ?? i + 1}. **${tech.id}** ${tech.name}${when}${note}`
  })
  return `# ${layer.name}\n\n${lines.join('\n') || '_No steps yet._'}\n`
}

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])

/** Open the timeline as a printable page; the user picks "Save as PDF" in the print dialog. */
export function printTimeline(layer, idx) {
  const body = esc(timelineMarkdown(layer, idx)).replace(/^# (.*)$/m, '<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(`<!doctype html><title>${esc(layer.name)}</title><body style="font:14px sans-serif;white-space:pre-wrap">${body}`)
  w.document.close()
  w.print()
  return true
}
