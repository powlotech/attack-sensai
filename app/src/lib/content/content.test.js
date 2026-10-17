import { expect, test } from 'vitest'
import attack from '../../../public/data/attack.json'
import tactics from './tactics.json'
import glossary from './glossary.json'
import { linkGlossary } from './glossary.js'

const words = (s) => s.trim().split(/\s+/).length
const sentences = (s) => s.split(/[.!?]+(?:\s|$)/).filter(Boolean).length

test('tactics.json covers exactly the dataset tactics, each goal short', () => {
  expect(Object.keys(tactics).sort()).toEqual(attack.tactics.map((t) => t.shortname).sort())
  for (const g of Object.values(tactics)) {
    expect(g.length).toBeGreaterThan(0)
    expect(words(g)).toBeLessThanOrEqual(9)
  }
})
test('glossary ids unique, definitions at most 2 sentences, required terms present', () => {
  const ids = glossary.map((g) => g.id)
  expect(new Set(ids).size).toBe(ids.length)
  for (const g of glossary) {
    expect(g.aliases).toBeInstanceOf(Array)
    expect(sentences(g.definition)).toBeLessThanOrEqual(2)
  }
  const names = glossary.flatMap((g) => [g.term, ...g.aliases]).join('|').toLowerCase()
  for (const t of ['command-line interface', 'c2', 'lateral movement', 'privilege', 'credential', 'payload', 'persistence',
    'exfiltration', 'lsass', 'registry', 'scheduled task', 'phishing', 'malware', 'backdoor', 'obfuscation', 'powershell',
    'wmi', 'api', 'process injection', 'hash']) expect(names).toContain(t)
})

const g = [{ id: 'hash', term: 'hash', aliases: [], definition: 'd' }, { id: 'c2', term: 'C2', aliases: ['command and control'], definition: 'd' }]
const root = (html) => {
  const el = document.createElement('div')
  el.innerHTML = html
  linkGlossary(el, g)
  return el
}
test('links only the first occurrence', () => {
  const el = root('<p>A hash and another hash.</p>')
  expect(el.querySelectorAll('button.gloss')).toHaveLength(1)
  expect(el.querySelector('button.gloss').dataset.term).toBe('hash')
  expect(el.querySelector('button.gloss').type).toBe('button')
})
test('respects word boundaries', () => {
  expect(root('<p>#hashtag rehash</p>').querySelectorAll('button.gloss')).toHaveLength(0)
})
test('skips a, code and button', () => {
  const el = root('<a href="#">hash</a><code>hash</code><button>hash</button>')
  expect(el.querySelectorAll('button.gloss')).toHaveLength(0)
})
test('aliases link, case-insensitively, and text is preserved', () => {
  const el = root('<p>Uses Command And Control here.</p>')
  expect(el.querySelector('button.gloss').textContent).toBe('Command And Control')
  expect(el.textContent).toBe('Uses Command And Control here.')
})
test('regex characters in terms are harmless', () => {
  const el = document.createElement('div')
  el.innerHTML = '<p>use C++ here</p>'
  linkGlossary(el, [{ id: 'cpp', term: 'C++', aliases: [], definition: 'd' }])
  expect(el.textContent).toBe('use C++ here')
})
