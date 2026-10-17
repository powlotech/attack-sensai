<script>
  import { route } from '../lib/router.js'

  const tabs = [
    { name: 'learn', label: 'Learn', href: '#/learn', d: 'M5 4h14v16H8a3 3 0 0 1-3-3V4z' },
    { name: 'matrix', label: 'Matrix', href: '#/matrix', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
    { name: 'search', label: 'Search', href: '#/search', d: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4 4' },
    { name: 'layers', label: 'Layers', href: '#/layers', d: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5' },
  ]
</script>

<nav aria-label="Main">
  {#each tabs as t}
    <a href={t.href} aria-current={$route.name === t.name ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d={t.d} /></svg>
      <span>{t.label}</span>
    </a>
  {/each}
</nav>

<style>
  nav {
    position: fixed; inset: auto 0 0 0; display: flex;
    background: var(--surface); border-top: 1px solid var(--border);
    padding-bottom: var(--sab);
  }
  a {
    flex: 1; min-height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px; color: var(--muted); text-decoration: none; font-size: 14px;
  }
  a[aria-current='page'] { color: var(--accent); font-weight: 600; }
</style>
