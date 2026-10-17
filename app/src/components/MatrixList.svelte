<script>
  import { tick } from 'svelte'
  import tacticGoals from '../lib/content/tactics.json'
  import { idx, activeLayer, dataset, highlight, platformFilter } from '../lib/stores.js'
  import { effectiveScore } from '../lib/matrix/summary.js'
  import { techniquesForPlatforms } from '../lib/search/search.js'
  import { PLATFORM_GROUPS } from '../lib/search/platforms.js'
  import ScoreSquare from './ScoreSquare.svelte'

  let { tactic } = $props()
  // svelte-ignore state_referenced_locally -- the prop only seeds the open section
  let open = $state(tactic)
  let subsOpen = $state({})
  const tactics = $derived($dataset?.tactics ?? [])
  const allowed = $derived($platformFilter.size ? techniquesForPlatforms($idx, $platformFilter) : null)
  const visible = (t) => !allowed || allowed.has(t.id)
  const filterLabel = $derived(PLATFORM_GROUPS.filter((g) => $platformFilter.has(g.key)).map((g) => g.label).join(', '))

  async function jump(shortname) {
    open = shortname
    await tick()
    document.getElementById('sec-' + shortname)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
</script>

{#if $highlight}
  <div class="banner">Highlighting {$highlight.label} <button type="button" aria-label="Clear highlight" onclick={() => highlight.set(null)}>✕</button></div>
{/if}
{#if allowed}
  <div class="banner">Platform: {filterLabel} <button type="button" aria-label="Clear platform filter" onclick={() => platformFilter.set(new Set())}>✕</button></div>
{/if}

<div class="chips" role="group" aria-label="Tactics">
  {#each tactics as t}
    <button type="button" class="chip" class:on={open === t.shortname} onclick={() => jump(t.shortname)}>{t.name}</button>
  {/each}
</div>

{#each tactics as t}
  {@const isOpen = open === t.shortname}
  <section id="sec-{t.shortname}">
    <button type="button" class="head" class:open={isOpen} aria-expanded={isOpen} onclick={() => (open = isOpen ? null : t.shortname)}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d={isOpen ? 'M6 9l6 6 6-6' : 'M9 5l7 7-7 7'} /></svg>
      <span class="name"><strong>{t.name}</strong>{#if isOpen && tacticGoals[t.shortname]} · {tacticGoals[t.shortname]}{/if}</span>
      <code>{t.id}</code>
    </button>
    {#if isOpen}
      {#each ($idx.topByTactic.get(t.shortname) ?? []).filter(visible) as tech (tech.id)}
        {@const subs = ($idx.childrenOf.get(tech.id) ?? []).filter(visible)}
        <div class="row" class:hl={$highlight?.ids.has(tech.id)}>
          <a href="#/technique/{tech.id}" class="main">
            <ScoreSquare score={effectiveScore($activeLayer, tech.id)} />
            <span class="t">{tech.name}</span>
            <code>{tech.id}</code>
          </a>
          {#if subs.length}
            <button type="button" class="subs" aria-expanded={!!subsOpen[tech.id]} onclick={() => (subsOpen[tech.id] = !subsOpen[tech.id])}>
              {subsOpen[tech.id] ? 'subs open' : '+ subs'}
            </button>
          {/if}
        </div>
        {#if subsOpen[tech.id]}
          {#each subs as sub (sub.id)}
            <a href="#/technique/{sub.id}" class="row sub" class:hl={$highlight?.ids.has(sub.id)}>
              <ScoreSquare score={effectiveScore($activeLayer, sub.id)} size={48} />
              <span class="t">{sub.name}</span>
              <code>.{sub.id.split('.')[1]}</code>
            </a>
          {/each}
        {/if}
      {/each}
    {/if}
  </section>
{/each}

<style>
  .banner { display: flex; justify-content: space-between; align-items: center; background: var(--accent-tint); color: var(--accent); border-radius: 12px; padding: 4px 8px 4px 14px; margin-bottom: var(--gap); font-weight: 600; }
  .banner button { background: none; border: 0; cursor: pointer; }
  .chips { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 12px; scrollbar-width: none; }
  .chip { flex: none; padding: 0 16px; border: 1px solid var(--border); border-radius: 22px; background: var(--surface); cursor: pointer; }
  .chip.on { background: var(--accent); border-color: var(--accent); color: var(--bg); font-weight: 600; }
  section { scroll-margin-top: var(--gap); }
  .head { width: 100%; display: flex; align-items: center; gap: 12px; padding: 0 20px; min-height: 52px; border: 0; border-top: 1px solid var(--border); background: var(--surface); text-align: left; cursor: pointer; margin: 0; }
  .head.open { background: var(--accent-tint); color: var(--accent); }
  .name { flex: 1; }
  code { font-size: 14px; color: var(--muted); }
  .row { display: flex; align-items: center; gap: 12px; padding: 8px 20px; border-top: 1px solid var(--border); background: var(--surface); color: inherit; text-decoration: none; min-height: 56px; }
  .row.hl { outline: 2px solid var(--accent); outline-offset: -2px; }
  .main { flex: 1; display: flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; min-width: 0; }
  .t { flex: 1; min-width: 0; }
  .main code { flex: none; }
  .sub { padding-left: 44px; background: var(--bg); }
  .subs { flex: none; border: 0; border-radius: 14px; background: var(--accent-tint); color: var(--accent); padding: 0 12px; min-height: 36px; cursor: pointer; }
</style>
