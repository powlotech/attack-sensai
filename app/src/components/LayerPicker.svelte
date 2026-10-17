<script>
  import { activeLayer, layers, refreshLayers } from '../lib/stores.js'
  import { setActiveLayerId } from '../lib/layers/store.js'

  let dlg
  async function pick(id) {
    setActiveLayerId(id)
    await refreshLayers()
    dlg.close()
  }
</script>

<button type="button" class="pill" onclick={() => dlg.showModal()} aria-haspopup="dialog">
  <i class="dot"></i><span>{$activeLayer?.name ?? 'No layer'}</span>
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
</button>

<dialog bind:this={dlg} aria-label="Choose layer" onclick={(e) => e.target === dlg && dlg.close()}>
  <h2>Layers</h2>
  <ul>
    {#each $layers as l}
      <li>
        <button type="button" role="menuitemradio" aria-checked={l.id === $activeLayer?.id} onclick={() => pick(l.id)}>
          <span>{l.name}</span>
          {#if l.id === $activeLayer?.id}<span aria-hidden="true">✓</span>{/if}
        </button>
      </li>
    {/each}
  </ul>
  <button type="button" class="close" onclick={() => dlg.close()}>Close</button>
</dialog>

<style>
  .pill {
    display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 16px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 24px; cursor: pointer; max-width: 60vw;
  }
  .pill span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dot { flex: none; width: 12px; height: 12px; border-radius: 50%; background: var(--score-3); }
  dialog {
    margin: auto 0 0; width: 100%; max-width: none; border: 0; border-radius: 20px 20px 0 0;
    background: var(--surface); color: var(--text); padding: 16px 16px calc(16px + var(--sab));
  }
  dialog::backdrop { background: rgb(0 0 0 / 0.45); }
  h2 { margin: 0 0 8px; font-size: 18px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li button { width: 100%; display: flex; justify-content: space-between; align-items: center; background: none; border: 0; border-bottom: 1px solid var(--border); padding: 0 4px; text-align: left; cursor: pointer; }
  .close { width: 100%; margin-top: 12px; border: 1px solid var(--border); border-radius: 12px; background: none; cursor: pointer; }
</style>
