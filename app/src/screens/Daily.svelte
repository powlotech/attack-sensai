<script>
  import tacticGoals from '../lib/content/tactics.json'
  import { dataset, idx, activeLayer, refreshLayers, showToast } from '../lib/stores.js'
  import { setEntry } from '../lib/layers/store.js'
  import { daily, setDaily, dailyQuestion, dayKey, currentStreak, recordAnswer } from '../lib/daily.js'

  const day = dayKey()
  const q = dailyQuestion($dataset, $idx, tacticGoals, day)
  const picked = $derived($daily.answer?.day === day ? $daily.answer.picked : null)

  const answer = async (opt) => {
    if (picked !== null) return
    const correct = opt === q.answer
    setDaily(recordAnswer($daily, day, opt, correct))
    if (correct && q.techId && $activeLayer) {
      await setEntry($activeLayer.id, q.techId, { learned: true })
      await refreshLayers()
      showToast(`${q.techId} marked as learned`)
    }
  }
</script>

<main>
  <h1>Daily question</h1>
  <a class="back" href="#/learn">← Learn</a>
  <p class="muted">🔥 {currentStreak($daily)} day streak</p>
  {#if !q}
    <p class="muted">Not enough data to build a question.</p>
  {:else}
    <section class="card">
      <p class="prompt">{q.prompt}</p>
      {#each q.options as opt}
        <button type="button" class="opt" class:right={picked !== null && opt === q.answer} class:wrong={opt === picked && opt !== q.answer} disabled={picked !== null} onclick={() => answer(opt)}>{opt}</button>
      {/each}
      {#if picked !== null}
        <p role="status">{picked === q.answer ? 'Correct!' : `Not quite: ${q.answer}`} Come back tomorrow for a new one.</p>
      {/if}
    </section>
  {/if}
</main>

<style>
  .back { display: inline-block; min-height: 44px; line-height: 44px; color: var(--accent); text-decoration: none; }
  main { padding: 24px 20px 32px; }
  h1 { font-size: 32px; margin: 0 0 4px; }
  .muted { color: var(--muted); margin: 0; }
  .card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px; margin-top: var(--gap); }
  .prompt { font-weight: 600; margin: 0 0 var(--gap); }
  .opt { display: block; width: 100%; min-height: 48px; margin-top: var(--gap); border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: inherit; font: inherit; text-align: left; padding: 0 14px; cursor: pointer; }
  .right { border-color: var(--accent); background: var(--accent-tint); }
  .wrong { border-style: dashed; text-decoration: line-through; }
</style>
