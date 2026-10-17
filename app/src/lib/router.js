import { readable } from 'svelte/store'

const ROUTES = new Set(['learn', 'intro', 'matrix', 'search', 'layers', 'settings'])
const DETAIL = new Set(['technique', 'group', 'software'])

const decode = (s) => {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '))
  } catch {
    return s
  }
}

/** '#/matrix?tactic=x' -> { name, params, query }. Unknown paths fall back to learn. */
export function parseHash(hash) {
  const [path, qs = ''] = hash.replace(/^#/, '').split('?')
  const [name, id] = path.split('/').filter(Boolean)
  const query = Object.fromEntries(
    qs.split('&').filter(Boolean).map((kv) => {
      const [k, v = ''] = kv.split('=')
      return [decode(k), decode(v)]
    }),
  )
  if (DETAIL.has(name) && id) return { name, params: { id: decode(id) }, query }
  return { name: ROUTES.has(name) ? name : 'learn', params: {}, query }
}

export const route = readable(parseHash(location.hash), (set) => {
  const on = () => set(parseHash(location.hash))
  window.addEventListener('hashchange', on)
  return () => window.removeEventListener('hashchange', on)
})

export const navigate = (path) => {
  location.hash = path.startsWith('#') ? path : '#' + path
}
export const back = () => history.back()
