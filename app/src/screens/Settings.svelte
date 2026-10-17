<script>
  const RELEASES = 'https://github.com/powlotech/attack-sensai/releases'
  import { dataset, idx, dataStatus, updateDomainData, showToast, refreshLayers } from '../lib/stores.js'
  import { exportProgress, importProgress } from '../lib/sync/progress.js'
  import { getSyncConfig, setSyncConfig, syncWithGithub } from '../lib/sync/github.js'
  import { shareOrDownload } from '../lib/layers/share.js'
  import { daily, setDaily } from '../lib/daily.js'
  import { allowNotifications, scheduleDaily, pendingSummary } from '../lib/native/daily.js'
  import tacticGoals from '../lib/content/tactics.json'
  import { syncStatusBar } from '../lib/native/statusBar.js'
  import { getThemePref, setThemePref, resolveTheme } from '../lib/theme/theme.js'

  let theme = $state(getThemePref())
  const rel = (ts) => {
    if (!ts) return 'never'
    const h = Math.floor((Date.now() - ts) / 36e5)
    return h < 1 ? 'just now' : h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`
  }

  async function toggleDaily(on) {
    if (on && !(await allowNotifications())) {
      setDaily({ on: false })
      return showToast('Notifications are only available in the Android app, and must be allowed')
    }
    setDaily({ on })
    const r = await scheduleDaily($dataset, $idx, tacticGoals).catch((e) => `Schedule failed: ${e.message ?? e}`)
    if (r) showToast(r)
    refreshPending()
  }
  let pending = $state('')
  const refreshPending = async () => { pending = await pendingSummary().catch(() => '') }
  refreshPending()
  // some Android pickers never fire `change`, so also act shortly after the last `input`
  let timer
  const timeSoon = (t) => { clearTimeout(timer); timer = setTimeout(() => changeTime(t), 800) }
  async function changeTime(time) {
    if (!time) return
    setDaily({ time })
    const r = await scheduleDaily($dataset, $idx, tacticGoals).catch((e) => `Schedule failed: ${e.message ?? e}`)
    if (r) showToast(r)
    refreshPending()
  }

  async function checkNow() {
    const r = await updateDomainData({ force: true })
    showToast(r.status === 'updated' ? 'Data updated' : r.status === 'error' ? 'Check failed' : 'Already up to date')
  }

  let fileInput
  let sync = $state(getSyncConfig())
  let busy = $state(false)
  const saveSync = () => setSyncConfig({ ...sync, token: sync.token.trim(), repo: sync.repo.trim() })
  const exportFile = async () => {
    const r = await shareOrDownload('attack-sensai-progress.json', await exportProgress())
    showToast(r === 'shared' ? 'Shared' : 'Downloaded attack-sensai-progress.json')
  }
  async function onFile(e) {
    const file = e.currentTarget.files[0]
    e.currentTarget.value = ''
    if (!file) return
    try {
      const r = await importProgress(JSON.parse(await file.text()))
      await refreshLayers()
      showToast(`Merged ${r.layers} layer${r.layers === 1 ? '' : 's'}, ${r.bookmarks} new bookmark${r.bookmarks === 1 ? '' : 's'}`)
    } catch (err) {
      showToast(err instanceof SyntaxError ? 'Not a valid JSON file' : err.message)
    }
  }
  async function syncNow() {
    saveSync()
    busy = true
    try {
      await syncWithGithub()
      await refreshLayers()
      sync = getSyncConfig()
      showToast('Synced')
    } catch (err) {
      showToast(err.message)
    } finally {
      busy = false
    }
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
  {#if $dataStatus.lastDiff}
    {@const d = $dataStatus.lastDiff}
    <details class="status">
      <summary>What changed in the last update ({d.from} → {d.to})</summary>
      {#each ['techniques', 'groups', 'software', 'campaigns', 'mitigations'] as kind}
        {#each [['added', 'Added'], ['changed', 'Changed'], ['removed', 'Deprecated/removed']] as [k, label]}
          {#if d[kind]?.[k].length}
            <p><strong>{label} {kind} ({d[kind][k].length}):</strong> {d[kind][k].map((o) => `${o.id} ${o.name}`).join(', ')}</p>
          {/if}
        {/each}
      {/each}
    </details>
  {/if}

  <h2>Theme</h2>
  <div class="seg" role="radiogroup" aria-label="Theme">
    {#each ['system', 'light', 'dark'] as p}
      <button type="button" role="radio" aria-checked={theme === p} class:on={theme === p} onclick={() => setTheme(p)}>{p[0].toUpperCase() + p.slice(1)}</button>
    {/each}
  </div>

  <h2>Daily question</h2>
  <label class="check"><input type="checkbox" checked={$daily.on} onchange={(e) => toggleDaily(e.currentTarget.checked)} /> Remind me every day (Android)</label>
  <label>Time <input type="time" value={$daily.time} oninput={(e) => timeSoon(e.currentTarget.value)} onchange={(e) => changeTime(e.currentTarget.value)} /></label>
  {#if pending}<p class="muted">{pending}</p>{/if}

  <h2>Sync progress</h2>
  <p class="muted">Layers (including learned ticks) and bookmarks. Importing merges and never overwrites: higher scores and learned ticks are kept, comments are joined. Deleted layers are not synced.</p>
  <div class="row">
    <button type="button" class="solid" onclick={exportFile}>Export file</button>
    <button type="button" class="ghost" onclick={() => fileInput.click()}>Import file</button>
  </div>
  <input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={onFile} />
  <label>GitHub repo (owner/name)<input bind:value={sync.repo} onchange={saveSync} placeholder="you/attack-sensai-sync" autocapitalize="off" spellcheck="false" /></label>
  <label>GitHub token (fine-grained, Contents read/write on that repo only)<input type="password" bind:value={sync.token} onchange={saveSync} autocomplete="off" /></label>
  <button type="button" class="solid" disabled={busy} onclick={syncNow}>{busy ? 'Syncing…' : 'Sync with GitHub'}</button>
  <p class="muted">Last synced: {rel(sync.last)}. The token stays on this device only.</p>

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
  .row { display: flex; gap: 8px; }
  .ghost, .solid { flex: 1; min-height: 52px; border: 1.5px solid var(--accent); border-radius: 16px; font: inherit; font-weight: 700; margin-top: 12px; cursor: pointer; }
  .ghost { background: none; color: var(--accent); }
  .solid { background: var(--accent); color: var(--bg); }
  .solid:disabled { opacity: 0.5; }
  .solid:not(.row .solid) { width: 100%; }
  label { display: block; margin: 12px 0 8px; font-size: 14px; }
  label input { display: block; width: 100%; box-sizing: border-box; margin-top: 4px; padding: 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); }
  label.check { display: flex; align-items: center; gap: 10px; }
  label.check input { display: inline-block; width: 20px; height: 20px; margin: 0; padding: 0; }
  .muted { color: var(--muted, inherit); opacity: 0.8; font-size: 14px; }
  .err { color: #b3261e; }
  .seg { display: flex; background: var(--border); border-radius: 12px; padding: 4px; }
  .seg button { flex: 1; border: 0; background: none; border-radius: 9px; color: var(--text); cursor: pointer; }
  .seg button.on { background: var(--surface); box-shadow: var(--shadow); font-weight: 700; }
  .about { color: var(--muted); }
  .about a { color: var(--accent); }
</style>
