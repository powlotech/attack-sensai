<script>
  import { route, navigate } from '../lib/router.js'
  import LayerPicker from '../components/LayerPicker.svelte'
  import MatrixList from '../components/MatrixList.svelte'
  import MatrixOverview from '../components/MatrixOverview.svelte'
  import { dataset } from '../lib/stores.js'

  const view = $derived($route.query.view === 'overview' ? 'overview' : 'list')
  const tactic = $derived($route.query.tactic ?? $dataset?.tactics[0]?.shortname)
  const setView = (v) => navigate(`/matrix?view=${v}&tactic=${tactic}`)
</script>

<main>
  <header>
    <h1>Matrix</h1>
    <LayerPicker />
  </header>

  <div class="seg" role="tablist" aria-label="View">
    {#each ['list', 'overview'] as v}
      <button type="button" role="tab" aria-selected={view === v} class:on={view === v} onclick={() => setView(v)}>{v === 'list' ? 'List' : 'Overview'}</button>
    {/each}
  </div>

  {#key tactic + view}
    {#if view === 'list'}
      <MatrixList {tactic} />
    {:else}
      <MatrixOverview {tactic} onopen={(s) => navigate(`/matrix?view=list&tactic=${s}`)} />
    {/if}
  {/key}
</main>

<div class="legend" aria-label="Score legend">
  <span>Score</span>
  {#each [0, 1, 2, 3, 4] as n}<span class="k"><i class:zero={n === 0} style="background: var(--score-{n})"></i>{n}</span>{/each}
  <span class="end">0 = not looked at</span>
</div>

<style>
  main { padding: 20px 20px 140px; }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  h1 { font-size: 32px; margin: 0; }
  .seg { display: flex; background: var(--border); border-radius: 16px; padding: 4px; margin-bottom: 12px; }
  .seg button { flex: 1; border: 0; border-radius: 12px; background: none; cursor: pointer; }
  .seg button.on { background: var(--surface); font-weight: 600; }
  .legend { position: fixed; inset: auto 0 calc(56px + env(safe-area-inset-bottom)) 0; display: flex; align-items: center; gap: 12px; padding: 10px 20px; background: var(--surface); border-top: 1px solid var(--border); color: var(--muted); font-size: 15px; }
  .k { display: inline-flex; align-items: center; gap: 4px; }
  .k i { width: 14px; height: 14px; border-radius: 3px; }
  .k i.zero { border: 1px solid var(--score-0-border); }
  .end { margin-left: auto; }
</style>
