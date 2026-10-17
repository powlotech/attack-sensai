const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const SKIP = new Set(['A', 'CODE', 'BUTTON'])

/** Wrap the first whole-word, case-insensitive occurrence of each glossary term in a button. */
export function linkGlossary(root, glossary) {
  for (const entry of glossary) {
    const names = [entry.term, ...entry.aliases].sort((a, b) => b.length - a.length)
    // \b fails next to symbols like "+", so use lookarounds on word characters instead
    const re = new RegExp(`(?<![\\w])(?:${names.map(esc).join('|')})(?![\\w])`, 'i')
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        for (let p = n.parentElement; p && p !== root.parentElement; p = p.parentElement) {
          if (SKIP.has(p.tagName)) return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      },
    })
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const m = re.exec(n.data)
      if (!m) continue
      const hit = n.splitText(m.index)
      hit.splitText(m[0].length)
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'gloss'
      b.dataset.term = entry.id
      hit.replaceWith(b)
      b.append(hit)
      break
    }
  }
}
