<script>
  // Bottom sheet for confirm and name prompts. Open with open({ title, message, label, input, danger, onconfirm }).
  let dlg
  let cfg = $state({})
  let text = $state('')
  export const open = (c) => {
    cfg = c
    text = c.input ?? ''
    dlg.showModal()
  }
  const ok = () => {
    if (cfg.input !== undefined && !text.trim()) return
    dlg.close()
    cfg.onconfirm(text.trim())
  }
</script>

<dialog bind:this={dlg} aria-label={cfg.title} onclick={(e) => e.target === dlg && dlg.close()}>
  <h2>{cfg.title}</h2>
  {#if cfg.message}<p>{cfg.message}</p>{/if}
  {#if cfg.input !== undefined}
    <input bind:value={text} aria-label="Name" maxlength="80" onkeydown={(e) => e.key === 'Enter' && ok()} />
  {/if}
  <div class="row">
    <button type="button" onclick={() => dlg.close()}>Cancel</button>
    <button type="button" class="go" class:danger={cfg.danger} onclick={ok}>{cfg.label ?? 'OK'}</button>
  </div>
</dialog>

<style>
  dialog {
    margin: auto 0 0; width: 100%; max-width: none; border: 0; border-radius: 20px 20px 0 0;
    background: var(--surface); color: var(--text); padding: 16px 16px calc(16px + var(--sab)); box-sizing: border-box;
  }
  dialog::backdrop { background: rgb(0 0 0 / 0.45); }
  h2 { margin: 0 0 8px; font-size: 18px; }
  input { width: 100%; box-sizing: border-box; min-height: 48px; padding: 0 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); color: var(--text); font: inherit; }
  .row { display: flex; gap: 8px; margin-top: 16px; }
  .row button { flex: 1; border: 1.5px solid var(--accent); border-radius: 12px; background: none; color: var(--accent); font-weight: 600; cursor: pointer; }
  .go { background: var(--accent) !important; color: var(--bg) !important; }
  .danger { background: #b3261e !important; border-color: #b3261e !important; }
</style>
