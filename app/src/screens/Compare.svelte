<script>
  import { route, navigate } from '../lib/router.js'
  import { idx, layers, activeLayer, platformFilter, refreshLayers, showToast } from '../lib/stores.js'
  import { techniquesForPlatforms } from '../lib/search/search.js'
  import { compareLayers } from '../lib/matrix/compare.js'
  import { createLayer, setActiveLayerId } from '../lib/layers/store.js'
  import ScoreSquare from '../components/ScoreSquare.svelte'

  const TABS = [['gaps', 'Gaps'], ['weak', 'Weak'], ['covered', 'Covered']]
  let refId = $state($route.query.ref ?? '')
  let mineId = $state($route.query.mine ?? '')
  let tab = $state('gaps')

  const ref = $derived($layers.find((l) => l.id === refId))
  const mine = $derived($layers.find((l) => l.id === mineId) ?? ($activeLayer?.id !== refId ? $activeLayer : null))
  const allowed = $derived($platformFilter.size && $idx ? techniquesForPlatforms($idx, $platformFilter) : null)
  const r = $derived(ref && mine && $idx ? compareLayers(ref, mine, $idx, allowed) : null)

  async function saveGaps() {
    const entries = Object.fromEntries(r.gaps.map((g) => [g.id, { score: 1, comment: '', learned: false, ...(g.order != null && { order: g.order }) }]))
    const l = await createLayer(`Gaps vs ${ref.name}`, entries)
    setActiveLayerId(l.id)
    await refreshLayers()
    showToast(`Saved ${r.gaps.length} gaps as a layer`)
    navigate('/layers')
  }
</script>

<main>
  <header><a href="#/layers" class="back">← Layers</a><h1>Compare</h1></header>
  <label>Reference <select bind:value={refId} aria-label="Reference layer"><option value="">Choose…</option>{#each $layers as l (l.id)}<option value={l.id}>{l.name}</option>{/each}</select></label>
  <label>Mine <select bind:value={mineId} aria-label="My layer"><option value="">Active layer</option>{#each $layers as l (l.id)}<option value={l.id}>{l.name}</option>{/each}</select></label>
  {#if allowed}<div class="banner">Platform filter on <button type="button" aria-label="Clear platform filter" onclick={() => platformFilter.set(new Set())}>✕</button></div>{/if}

  {#if !r}
    <p class="muted">Pick a reference layer (for example a threat group) and your own layer to see what you are missing.</p>
  {:else}
    <p class="sum"><strong>{r.gaps.length} of {r.total}</strong> techniques are gaps</p>
    <div class="seg" role="tablist" aria-label="Result">
      {#each TABS as [k, label]}
        <button type="button" role="tab" aria-selected={tab === k} class:on={tab === k} onclick={() => (tab = k)}>{label} ({r[k].length})</button>
      {/each}
    </div>
    <ul>
      {#each r[tab] as row (row.id)}
        <li>
          <a href="#/technique/{row.id}">
            <span class="txt"><strong>{row.tech.name}</strong> <code>{row.id}</code>{#if row.order != null}<small>Step {row.order}</small>{/if}</span>
            <ScoreSquare score={row.ref} size={32} /><ScoreSquare score={row.mine} size={32} />
          </a>
        </li>
      {:else}
        <li class="muted">Nothing here.</li>
      {/each}
    </ul>
    {#if tab === 'gaps' && r.gaps.length}<button type="button" class="solid" onclick={saveGaps}>Save gaps as layer</button>{/if}
    {#if r.extra.length}
      <details><summary>{r.extra.length} extra (only in mine)</summary>
        <ul>{#each r.extra as row (row.id)}<li><a href="#/technique/{row.id}"><span class="txt">{row.tech.name} <code>{row.id}</code></span><ScoreSquare score={row.mine} size={32} /></a></li>{/each}</ul>
      </details>
    {/if}
  {/if}
</main>

<style>
  main { padding: 16px 16px 96px; }
  label { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
  select { flex: 1; min-height: 44px; }
  .back { color: var(--accent); text-decoration: none; }
  .muted { color: var(--muted); }
  .banner { background: var(--accent-tint); padding: 6px 12px; border-radius: 12px; margin: 8px 0; }
  .sum { font-size: 18px; }
  .seg { display: flex; background: var(--border); border-radius: 16px; padding: 4px; margin-bottom: 12px; }
  .seg button { flex: 1; border: 0; border-radius: 12px; background: none; cursor: pointer; }
  .seg button.on { background: var(--surface); font-weight: 600; }
  ul { list-style: none; margin: 0; padding: 0; }
  a { display: flex; align-items: center; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--border); color: inherit; text-decoration: none; min-height: 52px; }
  .txt { flex: 1; min-width: 0; }
  small { display: block; color: var(--muted); }
  code { font-size: 13px; color: var(--muted); }
  .solid { width: 100%; margin-top: 12px; background: var(--accent); color: var(--bg); min-height: 52px; border: 0; border-radius: 16px; font-weight: 700; }
</style>
