<script>
  import { route, navigate } from '../lib/router.js'
  import { idx, highlight, platformFilter, refreshLayers, showToast } from '../lib/stores.js'
  import { buildSearchIndex, search, techniquesForPlatforms } from '../lib/search/search.js'
  import { PLATFORM_GROUPS } from '../lib/search/platforms.js'
  import { highlightFor, layerEntriesFor } from '../lib/search/actions.js'
  import { createLayer, setActiveLayerId } from '../lib/layers/store.js'
  import { debounce } from '../lib/util/debounce.js'

  const KINDS = [['techniques', 'Techniques'], ['groups', 'Groups'], ['software', 'Software'], ['campaigns', 'Campaigns']]
  let q = $state($route.query.q ?? '')
  let kind = $state(KINDS.some(([k]) => k === $route.query.kind) ? $route.query.kind : 'techniques')
  // svelte-ignore state_referenced_locally -- the prop only seeds the field
  let applied = $state(q)
  let openId = $state(null)

  const si = $derived($idx && buildSearchIndex($idx))
  const results = $derived(si ? search(si, applied, { kind, platforms: $platformFilter }) : [])
  const allowed = $derived($platformFilter.size ? techniquesForPlatforms($idx, $platformFilter) : null)

  // keep the hash in sync without adding history entries
  const sync = debounce((nq, nk) => {
    applied = nq
    history.replaceState(null, '', `#/search?q=${encodeURIComponent(nq)}&kind=${nk}`)
  }, 150)
  const onInput = () => sync.call(q, kind)
  const setKind = (k) => {
    kind = k
    openId = null
    sync.call(q, k)
  }
  const goTo = (name, k) => {
    q = applied = name
    kind = k
    openId = null
    history.replaceState(null, '', `#/search?q=${encodeURIComponent(name)}&kind=${k}`)
  }
  const campaignsOf = (g) => [...$idx.campaignsById.values()].filter((c) => c.groups.includes(g.id))
  const toggle = (key) => {
    const next = new Set($platformFilter)
    next.has(key) ? next.delete(key) : next.add(key)
    platformFilter.set(next)
  }

  const tacticName = (t) => $idx.byId.get(t.id) && (t.tactics ?? $idx.byId.get(t.parent)?.tactics ?? []).map((s) => s.replace(/-/g, ' ')).join(' · ')
  const techsOf = (item) => item.techniques.map((id) => $idx.byId.get(id)).filter((t) => t && (!allowed || allowed.has(t.id)))

  const plain = (md) => (md ?? '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  const doHighlight = (item) => {
    highlight.set(highlightFor(item))
    navigate('/matrix')
  }
  const saveLayer = async (item) => {
    const layer = await createLayer(item.name, layerEntriesFor(item))
    setActiveLayerId(layer.id)
    await refreshLayers()
    showToast(`Saved '${item.name}'`)
    navigate('/layers')
  }
</script>

<div class="page">
  <h1>Search</h1>
  <input type="search" bind:value={q} oninput={onInput} aria-label="Search" placeholder="Name, alias or T1059" autocomplete="off" />
  <div class="seg" role="tablist">
    {#each KINDS as [k, label]}
      <button type="button" role="tab" aria-selected={kind === k} class:on={kind === k} onclick={() => setKind(k)}>{label}</button>
    {/each}
  </div>
  <div class="chips">
    {#each PLATFORM_GROUPS as g}
      <button type="button" class="chip" class:on={$platformFilter.has(g.key)} aria-pressed={$platformFilter.has(g.key)} onclick={() => toggle(g.key)}>{g.label}</button>
    {/each}
  </div>

  {#if applied.trim() && !results.length}
    <p class="empty">No {kind} match “{applied}”.</p>
  {/if}

  {#if kind === 'techniques'}
    <ul class="list">
      {#each results as t (t.id)}
        <li><a href="#/technique/{t.id}"><span><strong>{t.name}</strong><small>{tacticName(t)}</small></span><code>{t.id}</code></a></li>
      {/each}
    </ul>
  {:else}
    {#each results as item (item.id)}
      <section class="card">
        <header><h2>{item.name}</h2><code>{item.id}</code></header>
        {#if item.aliases?.length}<p class="aka">Also known as: {item.aliases.join(', ')}</p>{/if}
        {#if kind === 'campaigns'}
          <p class="aka">
            {item.firstSeen ?? '?'} – {item.lastSeen ?? '?'} · {item.techniques.length} techniques
            {#if item.groups?.length}
              · Attributed to:
              {#each item.groups as g, i}{i ? ', ' : ''}<button type="button" class="lnk" onclick={() => goTo($idx.groupsById.get(g)?.name ?? g, 'groups')}>{$idx.groupsById.get(g)?.name ?? g}</button>{/each}
            {/if}
          </p>
        {:else if kind === 'groups' && campaignsOf(item).length}
          <p class="aka">
            Campaigns:
            {#each campaignsOf(item) as c, i}{i ? ', ' : ''}<button type="button" class="lnk" onclick={() => goTo(c.name, 'campaigns')}>{c.name}</button>{/each}
          </p>
        {/if}
        <p class="desc">{plain(item.description)}</p>
        <div class="actions">
          <button type="button" class="primary" onclick={() => doHighlight(item)}>Highlight in matrix</button>
          <button type="button" class="ghost" onclick={() => saveLayer(item)}>Save as layer</button>
        </div>
        <button type="button" class="more" aria-expanded={openId === item.id} onclick={() => (openId = openId === item.id ? null : item.id)}>
          Techniques it uses · {techsOf(item).length}{$platformFilter.size ? ' on selected platforms' : ''}
        </button>
        {#if openId === item.id}
          <ul class="list inner">
            {#each techsOf(item) as t (t.id)}
              <li><a href="#/technique/{t.id}"><span><strong>{t.name}</strong><small>{tacticName(t)}</small></span><code>{t.id}</code></a></li>
            {/each}
          </ul>
        {/if}
      </section>
    {/each}
  {/if}
</div>

<style>
  .page { padding: 12px 20px 96px; }
  h1 { margin: var(--gap) 0 var(--gap); font-size: 28px; }
  input { width: 100%; box-sizing: border-box; min-height: 52px; padding: 0 16px; border: 2px solid var(--accent); border-radius: 16px; background: var(--surface); color: var(--text); font: inherit; }
  .seg { display: flex; background: var(--border); border-radius: 12px; padding: 4px; margin: var(--gap) 0; }
  .seg button { flex: 1; border: 0; background: none; border-radius: 9px; color: var(--text); cursor: pointer; }
  .seg button.on { background: var(--surface); box-shadow: var(--shadow); font-weight: 700; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 12px; }
  .chip { flex: none; padding: 0 16px; border: 1px solid var(--border); border-radius: 22px; background: var(--surface); color: var(--text); cursor: pointer; }
  .chip.on { background: var(--text); color: var(--bg); font-weight: 600; }
  .empty { color: var(--muted); }
  .list { list-style: none; margin: 0; padding: 0; background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
  .list li + li { border-top: 1px solid var(--border); }
  .list a { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 16px; min-height: 56px; box-sizing: border-box; color: inherit; text-decoration: none; }
  .list strong { display: block; font-weight: 500; }
  .list small { color: var(--muted); text-transform: capitalize; }
  .list code { flex: none; color: var(--muted); }
  .card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px; margin-bottom: var(--gap); }
  .card header { display: flex; justify-content: space-between; align-items: baseline; }
  .card h2 { margin: 0; font-size: 20px; }
  .lnk { border: 0; background: none; padding: 0; font: inherit; color: var(--accent); text-decoration: underline; cursor: pointer; }
  .card code, .aka { color: var(--muted); }
  .desc { display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .actions { display: flex; gap: 8px; }
  .actions button { flex: 1; border: 1.5px solid var(--accent); border-radius: 12px; font-weight: 600; cursor: pointer; }
  .primary { background: var(--accent); color: var(--bg); }
  .ghost { background: none; color: var(--accent); }
  .more { width: 100%; margin-top: var(--gap); border: 0; background: none; color: var(--muted); font-weight: 600; text-align: left; text-transform: uppercase; font-size: 13px; letter-spacing: 0.04em; cursor: pointer; }
  .inner { margin-top: var(--gap); }
</style>
