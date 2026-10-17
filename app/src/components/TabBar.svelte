<script>
  import { route } from '../lib/router.js'

  let open = $state(false)

  const tabs = [
    { name: 'learn', label: 'Learn', href: '#/learn', d: 'M2 9l10-5 10 5-10 5-10-5zM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9v6' },
    { name: 'matrix', label: 'Matrix', href: '#/matrix', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
    { name: 'search', label: 'Search', href: '#/search', d: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4 4' },
    { name: 'layers', label: 'Layers', href: '#/layers', d: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5' },
    { name: 'bookmarks', label: 'Saved', href: '#/bookmarks', d: 'M6 3h12v18l-6-4-6 4z' },
    { name: 'settings', label: 'Settings', href: '#/settings', d: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6' },
  ]
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<button class="menu" aria-label="Open menu" aria-expanded={open} onclick={() => (open = true)}>
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
</button>

{#if open}
  <button class="backdrop" aria-label="Close menu" onclick={() => (open = false)}></button>
{/if}
<nav aria-label="Main" class:open inert={!open}>
  <button class="close" aria-label="Close menu" onclick={() => (open = false)}>
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
  </button>
  {#each tabs as t}
    <a href={t.href} onclick={() => (open = false)} aria-current={$route.name === t.name ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d={t.d} /></svg>
      <span>{t.label}</span>
    </a>
  {/each}
</nav>

<style>
  .menu {
    position: absolute; top: calc(var(--sat) + 24px); left: 8px; z-index: 20; background: none; border: 0; color: var(--text); cursor: pointer;
    display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;
  }
  .close {
    align-self: flex-end; margin: 4px var(--gap); width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
    background: none; border: 0; color: var(--muted); cursor: pointer;
  }
  .backdrop { position: fixed; inset: 0; z-index: 30; border: 0; background: rgb(0 0 0 / 0.5); }
  nav {
    position: fixed; inset: 0 auto 0 0; z-index: 40; width: min(280px, 80vw); display: flex; flex-direction: column;
    background: var(--surface); border-right: 1px solid var(--border);
    padding: var(--sat) 0 var(--sab); transform: translateX(-100%); transition: transform 0.2s ease;
  }
  nav.open { transform: none; }
  a {
    min-height: 56px; display: flex; align-items: center; gap: 16px; padding: 0 20px;
    color: var(--muted); text-decoration: none; font-size: 17px;
  }
  a[aria-current='page'] { color: var(--accent); font-weight: 600; }
  @media (prefers-reduced-motion: reduce) { nav { transition: none; } }
</style>
