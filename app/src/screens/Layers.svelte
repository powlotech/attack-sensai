<script>
  import { onMount } from 'svelte'
  import ConfirmSheet from '../components/ConfirmSheet.svelte'
  import { idx, layers, activeLayer, dataset, dataStatus, domain, DOMAINS, refreshLayers, switchDomain, updateDomainData, showToast } from '../lib/stores.js'
  import { createLayer, renameLayer, duplicateLayer, deleteLayer, ensureDefaultLayer, setActiveLayerId, orphanCount, isPersistent } from '../lib/layers/store.js'
  import { domainOfName, fromNavigatorLayer, toNavigatorLayer, exportFileName, LayerImportError } from '../lib/layers/navigator.js'
  import { navigate } from '../lib/router.js'
  import { syncStatusBar } from '../lib/native/statusBar.js'
  import { shareOrDownload } from '../lib/layers/share.js'
  import { getThemePref, setThemePref, resolveTheme } from '../lib/theme/theme.js'

  let sheet
  let fileInput
  let menuId = $state(null)
  let persistent = $state(true)
  let theme = $state(getThemePref())
  onMount(async () => (persistent = await isPersistent()))

  const after = () => refreshLayers()
  const count = (l) => Object.values(l.entries).filter((e) => e.score > 0).length
  const edited = (l) => {
    const days = Math.floor((Date.now() - l.updatedAt) / 864e5)
    return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
  }
  const rel = (ts) => {
    if (!ts) return 'never'
    const h = Math.floor((Date.now() - ts) / 36e5)
    return h < 1 ? 'just now' : h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`
  }

  const select = async (id) => {
    setActiveLayerId(id)
    await after()
  }
  const pickDomain = async (d) => {
    if (d === $domain) return
    await switchDomain(d)
    showToast(`Showing the ${DOMAINS.find(([k]) => k === d)[1]} matrix`)
  }
  const create = () =>
    sheet.open({ title: 'New layer', input: '', label: 'Create', onconfirm: async (name) => {
      const l = await createLayer(name)
      setActiveLayerId(l.id)
      await after()
    } })
  const rename = (l) =>
    sheet.open({ title: 'Rename layer', input: l.name, label: 'Rename', onconfirm: async (name) => {
      await renameLayer(l.id, name)
      await after()
    } })
  const duplicate = async (l) => {
    await duplicateLayer(l.id)
    await after()
  }
  const remove = (l) =>
    sheet.open({ title: `Delete '${l.name}'?`, message: 'This cannot be undone.', label: 'Delete', danger: true, onconfirm: async () => {
      await deleteLayer(l.id)
      await ensureDefaultLayer()
      await after()
    } })
  const exportLayer = async (l) => {
    const r = await shareOrDownload(exportFileName(l), toNavigatorLayer(l, { attackVersion: $dataset.attackVersion }))
    showToast(r === 'shared' ? 'Shared' : `Downloaded ${exportFileName(l)}`)
  }
  const act = (fn, l) => {
    menuId = null
    fn(l)
  }

  async function onFile(e) {
    const file = e.currentTarget.files[0]
    e.currentTarget.value = ''
    if (!file) return
    try {
      const json = JSON.parse(await file.text())
      const target = domainOfName(json?.domain)
      if (target && target !== $domain) await switchDomain(target)
      const r = fromNavigatorLayer(json, { knownIds: new Set($idx.byId.keys()) })
      const l = await createLayer(r.name, r.entries)
      setActiveLayerId(l.id)
      await after()
      showToast(`Imported '${r.name}' · ${Object.keys(r.entries).length} techniques${r.unknownCount ? ` · ${r.unknownCount} not found` : ''}`)
    } catch (err) {
      showToast(err instanceof LayerImportError ? err.message : err instanceof SyntaxError ? 'This file is not valid JSON.' : `Import failed: ${err.message}`)
    }
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
  <header><h1>Layers</h1><button type="button" class="new" onclick={create}>+ New</button></header>
  {#if !persistent}<p class="warn" role="alert">Layers won't be saved in this browser mode.</p>{/if}
  <div class="seg" role="group" aria-label="Matrix">
    {#each DOMAINS as [k, label]}
      <button type="button" aria-pressed={$domain === k} class:on={$domain === k} onclick={() => pickDomain(k)}>{label}</button>
    {/each}
  </div>
  <p class="lede">A layer is your own colouring of the matrix: progress, a threat group, or your detections. The active layer's scores show everywhere.</p>

  {#each $layers as l (l.id)}
    {@const orphans = $idx ? orphanCount(l, $idx) : 0}
    <div class="card" class:on={l.id === $activeLayer?.id}>
      <button type="button" class="pick" role="radio" aria-checked={l.id === $activeLayer?.id} onclick={() => select(l.id)}>
        <i class="radio"></i>
        <span><strong>{l.name}</strong><small>{count(l)} scored · edited {edited(l)}{#if orphans} · {orphans} no longer in ATT&CK{/if}</small></span>
      </button>
      <button type="button" class="dots" aria-label="Layer actions for {l.name}" aria-expanded={menuId === l.id} onclick={() => (menuId = menuId === l.id ? null : l.id)}>⋯</button>
      {#if menuId === l.id}
        <div class="menu" role="menu">
          <button type="button" role="menuitem" onclick={() => act(rename, l)}>Rename</button>
          <button type="button" role="menuitem" onclick={() => act(duplicate, l)}>Duplicate</button>
          <button type="button" role="menuitem" onclick={() => act(exportLayer, l)}>Export</button>
          <button type="button" role="menuitem" onclick={() => navigate(`/compare?ref=${l.id}`)}>Compare…</button>
          <button type="button" role="menuitem" class="del" onclick={() => act(remove, l)}>Delete</button>
        </div>
      {/if}
    </div>
  {/each}

  <input type="file" accept="application/json,.json" hidden bind:this={fileInput} onchange={onFile} />
  <button type="button" class="ghost" onclick={() => fileInput.click()}>Import Navigator file (.json)</button>
  <button type="button" class="solid" disabled={!$activeLayer} onclick={() => exportLayer($activeLayer)}>Share / export active layer</button>
  <p class="note">Exports open in the official MITRE ATT&CK Navigator.</p>

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

  <details class="about">
    <summary>About</summary>
    <p>© The MITRE Corporation. ATT&CK® is a registered trademark of The MITRE Corporation. This app is not affiliated with or endorsed by MITRE.</p>
    <p><a href="https://attack.mitre.org/resources/legal-and-branding/terms-of-use/" target="_blank" rel="noopener">MITRE ATT&CK terms of use</a></p>
  </details>
</div>

<ConfirmSheet bind:this={sheet} />

<style>
  .page { padding: 12px 20px 96px; }
  header { display: flex; justify-content: space-between; align-items: center; }
  h1 { margin: 8px 0; font-size: 28px; }
  h2 { font-size: 17px; margin: 24px 0 8px; }
  .new { background: var(--accent); color: var(--bg); border: 0; border-radius: 24px; padding: 0 20px; font-weight: 700; cursor: pointer; }
  .lede, .note { color: var(--muted); }
  .note { text-align: center; }
  .warn { background: var(--accent-tint); border-radius: 12px; padding: 10px 14px; font-weight: 600; }
  .card { position: relative; display: flex; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; margin-bottom: 12px; }
  .card.on { border: 2px solid var(--accent); }
  .pick { flex: 1; display: flex; align-items: center; gap: 14px; border: 0; background: none; color: inherit; text-align: left; padding: 16px; cursor: pointer; font: inherit; }
  .pick strong, .pick small { display: block; }
  .pick small { color: var(--muted); }
  .radio { flex: none; width: 24px; height: 24px; border: 2px solid var(--muted); border-radius: 50%; box-sizing: border-box; }
  .on .radio { border: 7px solid var(--accent); }
  .dots { border: 0; background: none; font-size: 24px; color: var(--muted); cursor: pointer; }
  .menu { position: absolute; right: 8px; top: 52px; z-index: 5; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 6px 20px rgb(0 0 0 / 0.2); display: flex; flex-direction: column; min-width: 160px; }
  .menu button { background: none; border: 0; text-align: left; padding: 0 16px; color: var(--text); cursor: pointer; }
  .menu .del { color: #b3261e; }
  .seg { display: flex; background: var(--border); border-radius: 16px; padding: 4px; margin-bottom: 12px; }
  .seg button { flex: 1; border: 0; border-radius: 12px; background: none; cursor: pointer; }
  .seg button.on { background: var(--surface); font-weight: 600; }
  .ghost, .solid { width: 100%; min-height: 52px; border: 1.5px solid var(--accent); border-radius: 16px; font-weight: 700; margin-top: 12px; cursor: pointer; }
  .ghost { background: none; color: var(--accent); }
  .solid { background: var(--accent); color: var(--bg); }
  .solid:disabled { opacity: 0.5; }
  .status { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--border); border-radius: 16px; padding: 12px 16px; margin-top: 24px; }
  .status button { border: 0; background: none; color: var(--accent); font-weight: 700; cursor: pointer; }
  .err { color: #b3261e; }
  .seg { display: flex; background: var(--border); border-radius: 12px; padding: 4px; }
  .seg button { flex: 1; border: 0; background: none; border-radius: 9px; color: var(--text); cursor: pointer; }
  .seg button.on { background: var(--surface); font-weight: 700; }
  .about { margin-top: 24px; color: var(--muted); }
  .about summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; }
  .about a { color: var(--accent); }
</style>
