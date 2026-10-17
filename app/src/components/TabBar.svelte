<script>
  import { route } from '../lib/router.js'

  const tabs = [
    { name: 'learn', label: 'Learn', href: '#/learn', d: 'M2 9l10-5 10 5-10 5-10-5zM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9v6' },
    { name: 'matrix', label: 'Matrix', href: '#/matrix', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
    { name: 'search', label: 'Search', href: '#/search', d: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4 4' },
    { name: 'layers', label: 'Layers', href: '#/layers', d: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5' },
    { name: 'bookmarks', label: 'Saved', href: '#/bookmarks', d: 'M6 3h12v18l-6-4-6 4z' },
    { name: 'settings', label: 'Settings', href: '#/settings', d: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6' },
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
