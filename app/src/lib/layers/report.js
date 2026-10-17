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

/** The incident timeline as a PDF Blob (jsPDF, Latin-1 text only; loaded on demand). */
export async function timelinePdf(layer, idx) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const h = doc.internal.pageSize.getHeight()
  const lines = doc.splitTextToSize(timelineMarkdown(layer, idx).replace(/^# /, '').replaceAll('**', ''), 495)
  let y = 50
  doc.setFontSize(11)
  for (const line of lines) {
    if (y > h - 50) (doc.addPage(), (y = 50))
    doc.text(line, 50, y)
    y += 15
  }
  return doc.output('blob')
}
