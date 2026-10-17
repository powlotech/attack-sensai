<script>
  import { idx, activeLayer, dataset } from '../lib/stores.js'
  import { effectiveScore, tacticAbbr, tacticSummary } from '../lib/matrix/summary.js'

  let { tactic, onopen } = $props()
  let selected = $state(tactic)
  const tactics = $derived($dataset?.tactics ?? [])
  const current = $derived(tactics.find((t) => t.shortname === selected) ?? tactics[0])
  const sum = $derived(current ? tacticSummary($idx, $activeLayer, current.shortname) : { scored: 0, total: 0 })
</script>

<div class="grid" style="--cols: {tactics.length}">
  {#each tactics as t}
    {@const s = tacticSummary($idx, $activeLayer, t.shortname)}
    <button type="button" class:sel={t.shortname === current?.shortname} aria-pressed={t.shortname === current?.shortname}
      aria-label="{t.name}: {s.scored} of {s.total} scored" onclick={() => (selected = t.shortname)}>
      <b>{tacticAbbr(t.shortname)}</b>
      <span class="cells">
        {#each $idx.topByTactic.get(t.shortname) as tech}
          <i style="background: var(--score-{effectiveScore($activeLayer, tech.id)})" class:zero={effectiveScore($activeLayer, tech.id) === 0}></i>
        {/each}
      </span>
    </button>
  {/each}
</div>

{#if current}
  <section class="card">
    <div class="row"><h2>{current.name}</h2><code>{current.id}</code></div>
    <p>{sum.scored} of {sum.total} techniques scored in this layer · tap a column to switch</p>
    <button type="button" class="open" onclick={() => onopen(current.shortname)}>Open in list →</button>
  </section>
{/if}

<style>
  .grid { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 2px; margin: 8px 0 16px; }
  .grid > button { background: none; border: 2px solid transparent; border-radius: 10px; padding: 4px 1px; min-width: 0; min-height: 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; align-self: start; }
  .grid > button.sel { border-color: var(--accent); }
  b { font: 500 11px 'IBM Plex Mono', monospace; color: var(--muted); }
  .sel b { color: var(--accent); }
  .cells { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; width: 100%; padding: 0 2px; }
  .cells i { aspect-ratio: 1; border-radius: 2px; }
  .cells i.zero { border: 1px solid var(--score-0-border); }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 16px; }
  .row { display: flex; justify-content: space-between; align-items: baseline; }
  h2 { margin: 0; font-size: 20px; }
  p { color: var(--muted); margin: 8px 0 12px; }
  .open { background: none; border: 0; padding: 0; font-weight: 600; font-size: 17px; cursor: pointer; }
</style>
