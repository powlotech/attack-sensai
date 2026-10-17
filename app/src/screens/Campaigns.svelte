<script>
  import { dataset, idx } from '../lib/stores.js'

  // newest first; campaigns without a start date go last
  const years = $derived.by(() => {
    const by = new Map()
    for (const c of $dataset?.campaigns ?? []) {
      const y = c.firstSeen?.slice(0, 4) ?? 'Unknown'
      if (!by.has(y)) by.set(y, [])
      by.get(y).push(c)
    }
    for (const list of by.values()) list.sort((a, b) => (b.firstSeen ?? '').localeCompare(a.firstSeen ?? ''))
    return [...by].sort(([a], [b]) => b.localeCompare(a))
  })
  const groupNames = (c) => c.groups.map((g) => $idx?.groupsById.get(g)?.name ?? g).join(', ')
</script>

<main>
  <h1>Campaigns</h1>
  <a class="back" href="#/learn">← Learn</a>
  <p class="muted">Real operations, by the year they started. Tap one to open it in Search.</p>

  {#each years as [year, list]}
    <h2>{year}</h2>
    {#each list as c (c.id)}
      <a class="card" href="#/search?q={encodeURIComponent(c.name)}&kind=campaigns">
        <strong>{c.name}</strong>
        <span class="muted">{c.firstSeen ?? '?'} – {c.lastSeen ?? '?'}{c.groups.length ? ` · ${groupNames(c)}` : ''}</span>
      </a>
    {/each}
  {:else}
    <p class="muted">No campaigns in the data yet.</p>
  {/each}
</main>

<style>
  main { padding: 24px 20px 96px; }
  .back { display: inline-block; min-height: 44px; line-height: 44px; color: var(--accent); text-decoration: none; }
  h2 { margin: var(--gap) 0 0; font-size: 18px; }
  .card { display: flex; flex-direction: column; gap: 2px; background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: 14px 16px; margin-top: var(--gap); color: inherit; text-decoration: none; }
</style>
