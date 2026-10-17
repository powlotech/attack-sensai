import { exportProgress, importProgress } from './progress.js'

const KEY = 'attack-learner.sync'
const FILE = 'progress.json'

export const getSyncConfig = () => {
  try {
    return { token: '', repo: '', last: 0, ...JSON.parse(localStorage.getItem(KEY)) }
  } catch {
    return { token: '', repo: '', last: 0 }
  }
}
export const setSyncConfig = (c) => localStorage.setItem(KEY, JSON.stringify(c))

const b64 = (text) => {
  let s = ''
  for (const b of new TextEncoder().encode(text)) s += String.fromCharCode(b)
  return btoa(s)
}
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0)))

async function gh(cfg, method, body) {
  const r = await fetch(`https://api.github.com/repos/${cfg.repo}/contents/${FILE}`, {
    method,
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  })
  if (r.status === 401) throw new Error('GitHub rejected the token')
  return r
}

/** Pull the repo's progress.json into this device, then push the merged result back. */
export async function syncWithGithub(cfg = getSyncConfig()) {
  if (!cfg.token || !/^[\w.-]+\/[\w.-]+$/.test(cfg.repo)) throw new Error('Set the token and repo (owner/name) first')
  for (let attempt = 0; attempt < 2; attempt++) {
    let sha
    const get = await gh(cfg, 'GET')
    if (get.status === 200) {
      const f = await get.json()
      sha = f.sha
      await importProgress(JSON.parse(unb64(f.content)))
    } else if (get.status !== 404) throw new Error(`GitHub error ${get.status} (check the repo name and token access)`)
    const put = await gh(cfg, 'PUT', { message: 'sync progress', content: b64(JSON.stringify(await exportProgress(), null, 2)), sha })
    if (put.ok) {
      setSyncConfig({ ...cfg, last: Date.now() })
      return
    }
    if (put.status !== 409 && put.status !== 422) throw new Error(`GitHub error ${put.status} on save`)
  } // lost a race with another device: loop pulls its change and retries once
  throw new Error('Another device saved at the same moment; try again')
}
