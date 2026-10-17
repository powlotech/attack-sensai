<script>
  import { onDestroy, untrack } from 'svelte'
  import { route, navigate, back } from '../lib/router.js'
  import { idx, dataset, activeLayer, refreshLayers } from '../lib/stores.js'
  import { setEntry } from '../lib/layers/store.js'
  import { debounce } from '../lib/util/debounce.js'
  import { renderDescription } from '../lib/content/renderDescription.js'
  import { linkGlossary } from '../lib/content/glossary.js'
  import glossary from '../lib/content/glossary.json'
  import { PLATFORM_GROUPS } from '../lib/search/platforms.js'

  const tech = $derived($idx?.byId.get($route.params.id))
  const parent = $derived(tech?.isSub ? $idx.byId.get(tech.parent) : null)
  const tacticShort = $derived((tech?.tactics?.length ? tech.tactics : parent?.tactics)?.[0])
  const tacticName = $derived($dataset?.tactics.find((t) => t.shortname === tacticShort)?.name ?? tacticShort)
  const entry = $derived(tech && $activeLayer?.entries[tech.id])
  const score = $derived(entry?.score ?? 0)
  const learned = $derived(!!entry?.learned)
  const used = $derived($idx?.usedBy.get(tech?.id) ?? { groups: [], software: [] })
  const usedAll = $derived([
    ...used.groups.map((g) => ({ ...g, kind: 'groups' })),
    ...used.software.map((s) => ({ ...s, kind: 'software' })),
  ])
  let showAll = $state(false)
  const usedShown = $derived(showAll ? usedAll : usedAll.slice(0, 6))

  let dirty = false // the draft has edits that are not stored yet
  const save = async (layerId, techId, patch) => {
    await setEntry(layerId, techId, patch)
    await refreshLayers()
    if (patch.comment !== undefined && patch.comment === note) dirty = false
  }
  const noteSaver = debounce(save, 500)
  let note = $state('')
  const techId = $derived(tech?.id)
  const layerId = $derived($activeLayer?.id)
  $effect(() => {
    // reset the draft only when the technique or layer changes, not on every save
    techId, layerId
    untrack(() => {
      noteSaver.flush()
      dirty = false
      note = ($activeLayer && tech && $activeLayer.entries[tech.id]?.comment) || ''
    })
  })
  $effect(() => {
    // a write still in flight when this page opened lands after mount; pick it up unless the user is typing
    const stored = entry?.comment ?? ''
    untrack(() => { if (!dirty) note = stored })
  })
  const setPatch = (patch) => $activeLayer && save($activeLayer.id, tech.id, patch)
  const onNote = () => $activeLayer && (dirty = true, noteSaver.call($activeLayer.id, tech.id, { comment: note }))

  const flush = () => noteSaver.flush()
  const onVis = () => document.visibilityState === 'hidden' && flush()
  $effect(() => {
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  })
  onDestroy(flush)

  let desc = $state()
  $effect(() => {
    if (!desc || !tech) return
    desc.innerHTML = renderDescription(tech.description)
    linkGlossary(desc, glossary)
  })
  const onDescClick = (e) => {
    const b = e.target.closest?.('.gloss')
    if (!b) return
    const block = b.closest('p, li')
    const next = block.nextElementSibling
    const open = next?.classList.contains('defcard') && next.dataset.term === b.dataset.term
    desc.querySelectorAll('.defcard').forEach((n) => n.remove())
    if (open) return
    const card = document.createElement('div')
    card.className = 'defcard'
    card.dataset.term = b.dataset.term
    const g = glossary.find((x) => x.id === b.dataset.term)
    card.innerHTML = '<strong></strong><span></span>'
    card.firstChild.textContent = g.term
    card.lastChild.textContent = ' ' + g.definition
    block.after(card)
  }
  const platformLabel = (p) => PLATFORM_GROUPS.find((g) => g.members.includes(p))?.label ?? p
</script>

{#if !tech}
  <p class="miss">Technique not found.</p>
{:else}
  <div class="page">
    <button type="button" class="back" onclick={back}>← {tacticName}</button>
    <h1>{tech.name}</h1>
    <p class="meta"><code>{tech.id}</code>
      {#if parent}· sub-technique of <a href="#/technique/{parent.id}">{parent.name}</a>{/if}</p>
    <div class="chips">
      {#each tech.platforms ?? [] as p}<span class="chip">{platformLabel(p)}</span>{/each}
    </div>

    {#if $activeLayer}
      <section class="card" aria-label="Layer {$activeLayer.name}">
        <h2>{$activeLayer.name}</h2>
        <div class="scores">
          {#each [0, 1, 2, 3, 4] as n}
            <button type="button" aria-pressed={score === n} class:on={score === n}
              style="background: var(--score-{n}); color: var(--score-{n}-text)"
              onclick={() => setPatch({ score: n })}>{n}</button>
          {/each}
        </div>
        <label class="learned"><input type="checkbox" checked={learned} onchange={(e) => setPatch({ learned: e.currentTarget.checked })} /> Learned it</label>
        <textarea rows="3" placeholder="Notes" bind:value={note} oninput={onNote}></textarea>
      </section>
    {/if}

    <h2>What it is</h2>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="desc" bind:this={desc} onclick={onDescClick}></div>

    {#if usedAll.length}
      <h2>Used by</h2>
      <div class="chips">
        {#each usedShown as u (u.kind + u.id)}
          <a class="chip link" href="#/search?q={encodeURIComponent(u.name)}&kind={u.kind}">{u.name}</a>
        {/each}
        {#if !showAll && usedAll.length > 6}
          <button type="button" class="chip" onclick={() => (showAll = true)}>+{usedAll.length - 6} more</button>
        {/if}
      </div>
    {/if}

    <a class="ext" href={tech.url} target="_blank" rel="noopener">Open on attack.mitre.org ↗</a>
  </div>
{/if}

<style>
  .page { padding: 12px 20px 32px; }
  .miss { padding: 24px; }
  .back { border: 0; background: none; color: var(--accent); font-weight: 600; padding: 0; cursor: pointer; }
  h1 { margin: 8px 0 4px; font-size: 26px; }
  h2 { font-size: 17px; margin: 20px 0 8px; }
  .meta { color: var(--muted); margin: 0 0 8px; }
  .meta a { color: var(--accent); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { border: 1px solid var(--border); border-radius: 18px; padding: 0 14px; min-height: 36px; display: inline-flex; align-items: center; background: var(--surface); color: inherit; text-decoration: none; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 4px 16px 16px; margin-top: 16px; }
  .scores { display: flex; gap: 8px; }
  .scores button { flex: 1; border: 1.5px solid var(--score-0-border); border-radius: 10px; font-weight: 700; font-size: 17px; cursor: pointer; }
  .scores button.on { outline: 3px solid var(--accent); outline-offset: 2px; }
  .learned { display: flex; align-items: center; gap: 10px; min-height: 44px; margin-top: 8px; }
  textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: var(--bg); color: var(--text); font: inherit; }
  .desc :global(.defcard) { background: var(--accent-tint); border-radius: 10px; padding: 10px 12px; margin: 0 0 12px; }
  .ext { display: inline-block; margin-top: 24px; color: var(--accent); font-weight: 600; }
</style>
