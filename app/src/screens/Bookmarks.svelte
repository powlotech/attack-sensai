<script>
  import { idx, domain, showToast } from '../lib/stores.js'
  import { bookmarks, toggleBookmark, setBookmarkNote, exportBookmarks, importBookmarks } from '../lib/bookmarks.js'
  import { shareOrDownload } from '../lib/layers/share.js'

  let fileInput
  const name = (id) => $idx?.byId.get(id)?.name ?? id
  const here = (list) => list.filter((b) => b.domain === $domain)
  const saved = $derived(here($bookmarks.saved))
  const recent = $derived(here($bookmarks.recent))

  const exportAll = async () => {
    const r = await shareOrDownload('attack-sensai-bookmarks.json', exportBookmarks($bookmarks))
    showToast(r === 'shared' ? 'Shared' : 'Downloaded attack-sensai-bookmarks.json')
  }
  async function onFile(e) {
    const file = e.currentTarget.files[0]
    e.currentTarget.value = ''
    if (!file) return
    try {
      const n = importBookmarks(JSON.parse(await file.text()))
      showToast(n ? `Added ${n} bookmark${n === 1 ? '' : 's'}` : 'Nothing new to add')
    } catch (err) {
      showToast(err instanceof SyntaxError ? 'Not a valid JSON file' : err.message)
    }
  }
</script>

<main>
  <h1>Saved</h1>
  <p class="muted">Techniques you bookmarked in this matrix, with your own notes.</p>

  {#each saved as b (b.id)}
    <section class="card">
      <div class="row">
        <a href="#/technique/{b.id}"><strong>{name(b.id)}</strong> <code class="muted">{b.id}</code></a>
        <button type="button" class="link" aria-label="Remove bookmark {name(b.id)}" onclick={() => toggleBookmark(b.id, b.domain)}>Remove</button>
      </div>
      <textarea rows="2" placeholder="Add a note (optional)" aria-label="Note for {name(b.id)}" value={b.note}
        onchange={(e) => setBookmarkNote(b.id, b.domain, e.currentTarget.value)}></textarea>
    </section>
  {:else}
    <p class="muted empty">Nothing saved yet. Tap ☆ Save on a technique page.</p>
  {/each}

  {#if recent.length}
    <h2>Recently viewed</h2>
    <section class="card recent">
      {#each recent as r (r.id)}
        <a href="#/technique/{r.id}">{name(r.id)} <code class="muted">{r.id}</code></a>
      {/each}
    </section>
  {/if}

  <input type="file" accept="application/json,.json" hidden bind:this={fileInput} onchange={onFile} />
  <button type="button" class="solid" disabled={!$bookmarks.saved.length} onclick={exportAll}>Export bookmarks</button>
  <button type="button" class="ghost" onclick={() => fileInput.click()}>Import bookmarks</button>
  <p class="muted hint">Export a file, then import it on another device to move your bookmarks and notes. Import adds to what is already saved.</p>
</main>

<style>
  main { padding: 24px 20px 32px; }
  h1 { font-size: 32px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: var(--gap) 0 0; }
  .muted { color: var(--muted); margin: 0; }
  .empty { margin-top: var(--gap); }
  .card { display: block; background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px; margin-top: var(--gap); }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  a { color: inherit; text-decoration: none; }
  textarea { width: 100%; box-sizing: border-box; margin-top: var(--gap); font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 10px; resize: vertical; }
  .link { background: none; border: 0; color: var(--muted); min-height: 44px; padding: 0 4px; cursor: pointer; }
  .recent a { display: block; min-height: 44px; line-height: 44px; }
  .ghost, .solid { width: 100%; min-height: 52px; border: 1.5px solid var(--accent); border-radius: 16px; font: inherit; font-weight: 700; margin-top: var(--gap); cursor: pointer; }
  .ghost { background: none; color: var(--accent); }
  .solid { background: var(--accent); color: var(--bg); }
  .solid:disabled { opacity: 0.5; }
  .hint { margin-top: var(--gap); font-size: 14px; }
  code { font-size: 13px; }
</style>
