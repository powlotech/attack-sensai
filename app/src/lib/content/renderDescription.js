import { marked } from 'marked'
import DOMPurify from 'dompurify'

const MITRE = 'https://attack.mitre.org'

/** Markdown (MITRE description) -> sanitised HTML with absolute, new-tab links. */
export function renderDescription(md) {
  const html = DOMPurify.sanitize(marked.parse(md ?? '', { async: false }), {
    ALLOWED_TAGS: ['p', 'ul', 'ol', 'li', 'a', 'code', 'em', 'strong', 'br'],
    ALLOWED_ATTR: ['href'],
  })
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  for (const a of tpl.content.querySelectorAll('a')) {
    const href = a.getAttribute('href') ?? ''
    if (href.startsWith('/')) a.setAttribute('href', MITRE + href)
    a.target = '_blank'
    a.rel = 'noopener'
  }
  return tpl.innerHTML
}
