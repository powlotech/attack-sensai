<script>
  import { onMount } from 'svelte'
  import ConfirmSheet from '../components/ConfirmSheet.svelte'
  import { idx, layers, activeLayer, dataset, domain, DOMAINS, refreshLayers, switchDomain, showToast } from '../lib/stores.js'
  import { createLayer, renameLayer, duplicateLayer, mergeLayers, layerDomain, deleteLayer, ensureDefaultLayer, setActiveLayerId, orphanCount, isPersistent } from '../lib/layers/store.js'
  import { domainOfName, fromNavigatorLayer, toNavigatorLayer, exportFileName, LayerImportError } from '../lib/layers/navigator.js'
  import { navigate } from '../lib/router.js'
  import { shareOrDownload } from '../lib/layers/share.js'
  import { layerCsv, timelineMarkdown, timelineHtml, printTimeline } from '../lib/layers/report.js'

  let sheet
  let fileInput
  let mergeDlg
  let mergeFrom = $state(null)
  let menuId = $state(null)
  let persistent = $state(true)
  onMount(async () => (persistent = await isPersistent()))

  const after = () => refreshLayers()
  const count = (l) => Object.values(l.entries).filter((e) => e.score > 0).length
  const edited = (l) => {
    const days = Math.floor((Date.now() - l.updatedAt) / 864e5)
    return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
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
  const merge = (l) => {
    mergeFrom = l
    mergeDlg.showModal()
  }
  const mergeWith = async (other) => {
    mergeDlg.close()
    const m = await mergeLayers(mergeFrom.id, other.id)
    setActiveLayerId(m.id)
    await after()
    showToast(`Created '${m.name}'`)
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
  const exportText = async (l, text, ext, type) => {
    const name = `${l.name.replace(/[^\w-]+/g, '-')}.${ext}`
    const r = await shareOrDownload(name, text, type)
    showToast(r === 'shared' ? 'Shared' : `Downloaded ${name}`)
  }
  const exportCsv = (l) => exportText(l, layerCsv(l, $idx), 'csv', 'text/csv')
  const exportMd = (l) => exportText(l, timelineMarkdown(l, $idx), 'md', 'text/markdown')
  const printPdf = async (l) => {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      await exportText(l, timelineHtml(l, $idx), 'html', 'text/html')
      showToast('Open the file in Chrome, then Print > Save as PDF')
    } else printTimeline(l, $idx)
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
          <button type="button" role="menuitem" onclick={() => act(merge, l)}>Merge into new layer…</button>
          <button type="button" role="menuitem" onclick={() => act(exportLayer, l)}>Export</button>
          <button type="button" role="menuitem" onclick={() => act(exportCsv, l)}>Export CSV</button>
          <button type="button" role="menuitem" onclick={() => act(exportMd, l)}>Export timeline (.md)</button>
          <button type="button" role="menuitem" onclick={() => act(printPdf, l)}>Print timeline / PDF</button>
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
</div>

<ConfirmSheet bind:this={sheet} />

<dialog bind:this={mergeDlg} aria-label="Merge layers" onclick={(e) => e.target === mergeDlg && mergeDlg.close()}>
  <h2>Merge '{mergeFrom?.name}' with…</h2>
  <p class="note">Creates a new layer. Higher score wins; the originals are not changed.</p>
  <ul>
    {#each $layers.filter((o) => mergeFrom && o.id !== mergeFrom.id && layerDomain(o) === layerDomain(mergeFrom)) as o (o.id)}
      <li><button type="button" onclick={() => mergeWith(o)}>{o.name}</button></li>
    {:else}
      <li class="note">No other layer in this matrix.</li>
    {/each}
  </ul>
  <button type="button" class="close" onclick={() => mergeDlg.close()}>Cancel</button>
</dialog>

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
  .seg { display: flex; background: var(--border); border-radius: 12px; padding: 4px; }
  .seg button { flex: 1; border: 0; background: none; border-radius: 9px; color: var(--text); cursor: pointer; }
  .seg button.on { background: var(--surface); font-weight: 700; }
  dialog { margin: auto 0 0; width: 100%; max-width: none; border: 0; border-radius: 20px 20px 0 0; background: var(--surface); color: var(--text); padding: 16px 16px calc(16px + var(--sab)); box-sizing: border-box; }
  dialog::backdrop { background: rgb(0 0 0 / 0.45); }
  dialog h2 { margin: 0 0 8px; font-size: 18px; }
  dialog ul { list-style: none; margin: 0; padding: 0; }
  dialog li button { width: 100%; min-height: 48px; text-align: left; background: none; border: 0; border-bottom: 1px solid var(--border); padding: 0 4px; cursor: pointer; }
  dialog .close { width: 100%; margin-top: 12px; border: 1px solid var(--border); border-radius: 12px; background: none; cursor: pointer; }
</style>
