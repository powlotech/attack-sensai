<script>
  const RELEASES = 'https://github.com/powlotech/attack-learner/releases'
  import { dataset, dataStatus, updateDomainData, showToast } from '../lib/stores.js'
  import { syncStatusBar } from '../lib/native/statusBar.js'
  import { getThemePref, setThemePref, resolveTheme } from '../lib/theme/theme.js'

  let theme = $state(getThemePref())
  const rel = (ts) => {
    if (!ts) return 'never'
    const h = Math.floor((Date.now() - ts) / 36e5)
    return h < 1 ? 'just now' : h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`
  }

  async function checkNow() {
    const r = await updateDomainData({ force: true })
    showToast(r.status === 'updated' ? 'Data updated' : r.status === 'error' ? 'Check failed' : 'Already up to date')
  }

  const setTheme = (p) => {
    theme = p
    setThemePref(p)
    const resolved = resolveTheme(p, matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.theme = resolved
    syncStatusBar(resolved).catch(() => {})
  }
</script>

<div class="page">
  <h1>Settings</h1>
  <div class="status">
    <span>ATT&CK data {$dataStatus.attackVersion ?? $dataset?.attackVersion ?? '—'} · checked {rel($dataStatus.lastChecked)}{#if $dataStatus.lastError}<br /><small class="err">Last error: {$dataStatus.lastError}</small>{/if}</span>
    <button type="button" onclick={checkNow}>Check now</button>
  </div>

  <h2>Theme</h2>
  <div class="seg" role="radiogroup" aria-label="Theme">
    {#each ['system', 'light', 'dark'] as p}
      <button type="button" role="radio" aria-checked={theme === p} class:on={theme === p} onclick={() => setTheme(p)}>{p[0].toUpperCase() + p.slice(1)}</button>
    {/each}
  </div>

  <section class="about">
    <h2>About</h2>
    <p>Version {__APP_VERSION__} · ATT&CK data {$dataset?.attackVersion ?? '—'}</p>
    <p><a href={RELEASES + (/^v\d/.test(__APP_VERSION__) ? `/tag/${__APP_VERSION__}` : '')} target="_blank" rel="noopener">Release notes</a></p>
    <p>© The MITRE Corporation. ATT&CK® is a registered trademark of The MITRE Corporation. This app is not affiliated with or endorsed by MITRE.</p>
    <p><a href="https://attack.mitre.org/resources/legal-and-branding/terms-of-use/" target="_blank" rel="noopener">MITRE ATT&CK terms of use</a></p>
  </section>
</div>

<style>
  .page { padding: 12px 20px 96px; }
  h1 { margin: 8px 0; font-size: 28px; }
  h2 { font-size: 17px; margin: 24px 0 8px; }
  .status { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--border); border-radius: 16px; padding: 12px 16px; margin-top: 24px; }
  .status button { border: 0; background: none; color: var(--accent); font-weight: 700; cursor: pointer; }
  .err { color: #b3261e; }
  .seg { display: flex; background: var(--border); border-radius: 12px; padding: 4px; }
  .seg button { flex: 1; border: 0; background: none; border-radius: 9px; color: var(--text); cursor: pointer; }
  .seg button.on { background: var(--surface); font-weight: 700; }
  .about { color: var(--muted); }
  .about a { color: var(--accent); }
</style>
