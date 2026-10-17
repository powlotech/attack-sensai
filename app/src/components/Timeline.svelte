<script>
  import { idx, dataset, activeLayer } from '../lib/stores.js'
  import { timelineOf } from '../lib/matrix/timeline.js'
  import ScoreSquare from './ScoreSquare.svelte'

  const rows = $derived($idx ? timelineOf($activeLayer, $idx) : [])
  const tacticName = (t) => $dataset.tactics.find((x) => x.shortname === (t.tactics?.[0] ?? $idx.byId.get(t.parent)?.tactics?.[0]))?.name ?? ''
</script>

{#if rows.length === 0}
  <p class="empty">No steps yet. Open a technique and set "Step #" to build the sequence of an incident in this layer.</p>
{:else}
  <ol>
    {#each rows as { tech, entry } (tech.id)}
      <li>
        <a href="#/technique/{tech.id}">
          <span class="n">{entry.order ?? '–'}</span>
          <span class="txt">
            <strong>{tech.name}</strong> <code>{tech.id}</code>
            <small>{tacticName(tech)}{#if entry.when} · {entry.when}{/if}</small>
            {#if entry.comment}<small class="note">{entry.comment}</small>{/if}
          </span>
          <ScoreSquare score={entry.score} size={36} />
        </a>
      </li>
    {/each}
  </ol>
{/if}

<style>
  ol { list-style: none; margin: 0; padding: 0; }
  a { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); color: inherit; text-decoration: none; min-height: 56px; }
  .n { flex: none; width: 36px; height: 36px; border-radius: 50%; background: var(--accent-tint); color: var(--accent); font-weight: 700; display: grid; place-items: center; }
  .txt { flex: 1; min-width: 0; }
  small { display: block; color: var(--muted); }
  .note { white-space: pre-wrap; overflow-wrap: anywhere; }
  .empty { color: var(--muted); }
  code { font-size: 13px; color: var(--muted); }
</style>
