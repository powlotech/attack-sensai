<script>
  import { onMount } from 'svelte'
  import { startTheme } from './lib/theme/theme.js'
  import { toast, dataset, idx, domain, switchDomain, updateDomainData } from './lib/stores.js'
  import { get } from 'svelte/store'
  import { navigate, route } from './lib/router.js'
  import TabBar from './components/TabBar.svelte'
  import Intro from './screens/Intro.svelte'
  import Learn from './screens/Learn.svelte'
  import Quiz from './screens/Quiz.svelte'
  import Daily from './screens/Daily.svelte'
  import tacticGoals from './lib/content/tactics.json'
  import { scheduleDaily, onReminderTap } from './lib/native/daily.js'
  import Coverage from './screens/Coverage.svelte'
  import Campaigns from './screens/Campaigns.svelte'
  import Settings from './screens/Settings.svelte'
  import Search from './screens/Search.svelte'
  import { syncStatusBar } from './lib/native/statusBar.js'
  import Layers from './screens/Layers.svelte'
  import Compare from './screens/Compare.svelte'
  import Technique from './screens/Technique.svelte'
  import Matrix from './screens/Matrix.svelte'
  import Bookmarks from './screens/Bookmarks.svelte'

  let ready = $state(false)
  let failure = $state('')

  const introSeen = () => {
    try {
      return !!localStorage.getItem('introSeen')
    } catch {
      return true // storage blocked: don't nag with the intro on every launch
    }
  }

  onMount(() => {
    const stopTheme = startTheme((t) => syncStatusBar(t).catch(() => {}))
    ;(async () => {
      try {
        await switchDomain(get(domain))
        if (!introSeen() && $route.name !== 'intro') navigate('/intro')
        ready = true
        onReminderTap(() => navigate('/daily'))
        scheduleDaily(get(dataset), get(idx), tacticGoals)
        await updateDomainData()
      } catch (e) {
        failure = e.message
      }
    })()
    return stopTheme
  })

  const chrome = $derived(!['intro'].includes($route.name))
</script>

{#if failure}
  <p role="alert" style="padding: 24px">Could not load ATT&CK data: {failure}</p>
{:else if ready}
  {#if $route.name === 'intro'}
    <Intro />
  {:else if $route.name === 'learn'}
    <Learn />
  {:else if $route.name === 'matrix'}
    <Matrix />
  {:else if $route.name === 'search'}
    <Search />
  {:else if $route.name === 'layers'}
    <Layers />
  {:else if $route.name === 'compare'}
    <Compare />
  {:else if $route.name === 'bookmarks'}
    <Bookmarks />
  {:else if $route.name === 'settings'}
    <Settings />
  {:else if $route.name === 'coverage'}
    <Coverage />
  {:else if $route.name === 'campaigns'}
    <Campaigns />
  {:else if $route.name === 'quiz'}
    <Quiz />
  {:else if $route.name === 'daily'}
    <Daily />
  {:else if $route.name === 'technique'}
    <Technique />
  {:else}
    <p style="padding: 24px">Coming soon: {$route.name}</p>
  {/if}
  {#if $toast}<div class="toast" role="status">{$toast}</div>{/if}
  {#if chrome}<TabBar />{/if}
{:else}
  <p style="padding: 24px">Loading…</p>
{/if}

<style>
  .toast { position: fixed; left: 16px; right: 16px; bottom: calc(24px + var(--sab)); z-index: 10; background: var(--text); color: var(--bg); border-radius: 12px; padding: 12px 16px; text-align: center; }
</style>
