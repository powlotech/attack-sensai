<script>
  import { onMount } from 'svelte'
  import { startTheme } from './lib/theme/theme.js'
  import { checkForUpdate, getDataStatus, loadDataset } from './lib/data/dataset.js'
  import { ensureDefaultLayer } from './lib/layers/store.js'
  import { dataStatus, toast, refreshLayers, setDataset } from './lib/stores.js'
  import { navigate, route } from './lib/router.js'
  import TabBar from './components/TabBar.svelte'
  import Intro from './screens/Intro.svelte'
  import Learn from './screens/Learn.svelte'
  import Search from './screens/Search.svelte'
  import Technique from './screens/Technique.svelte'
  import Matrix from './screens/Matrix.svelte'

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
    const stopTheme = startTheme()
    ;(async () => {
      try {
        const { data } = await loadDataset()
        setDataset(data)
        await ensureDefaultLayer()
        await refreshLayers()
        dataStatus.set(await getDataStatus())
        if (!introSeen() && $route.name !== 'intro') navigate('/intro')
        ready = true
        const result = await checkForUpdate({ current: data })
        if (result.status === 'updated') setDataset(result.data)
        dataStatus.set(await getDataStatus())
      } catch (e) {
        failure = e.message
      }
    })()
    return stopTheme
  })

  const chrome = $derived(!['intro', 'technique'].includes($route.name))
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
  .toast { position: fixed; left: 16px; right: 16px; bottom: 88px; z-index: 10; background: var(--text); color: var(--bg); border-radius: 12px; padding: 12px 16px; text-align: center; }
</style>
