<script>
  import { dataset, activeLayer } from '../lib/stores.js'
  import { coverage, nextToLearn } from '../lib/matrix/coverage.js'

  const rows = $derived($dataset ? coverage($dataset, $activeLayer?.entries) : [])
  const next = $derived(nextToLearn(rows))
</script>

<main>
  <h1>Detailed Progress</h1>
  <p class="muted">Techniques you have ticked "Learned it", by tactic.</p>

  {#each rows as r}
    <a class="card" href="#/matrix?tactic={r.tactic.shortname}">
      <div class="row"><strong>{r.tactic.name}</strong><span class="muted">{r.learned} of {r.total} · {r.total ? Math.round((100 * r.learned) / r.total) : 0}%</span></div>
      <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax={r.total} aria-valuenow={r.learned} aria-label="{r.tactic.name} learned">
        <span style="width: {r.total ? (100 * r.learned) / r.total : 0}%"></span>
      </div>
    </a>
  {/each}

  {#if next.length}
    <h2>Next to learn</h2>
    <p class="muted">From your least-covered tactic.</p>
    {#each next as t}
      <a class="card next" href="#/technique/{t.id}"><strong>{t.name}</strong> <code class="muted">{t.id}</code></a>
    {/each}
  {/if}
</main>

<style>
  main { padding: 24px 20px 32px; }
  h1 { font-size: 32px; margin: 0 0 4px; }
  h2 { font-size: 22px; margin: 28px 0 0; }
  .muted { color: var(--muted); margin: 0; }
  .card { display: block; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 16px; margin-top: 12px; color: inherit; text-decoration: none; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .track { height: 8px; border-radius: 4px; background: var(--border); margin-top: 12px; overflow: hidden; }
  .track span { display: block; height: 100%; background: var(--accent); }
  .next { min-height: 56px; box-sizing: border-box; }
</style>
