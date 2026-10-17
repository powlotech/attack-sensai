<script>
  import tacticGoals from '../lib/content/tactics.json'
  import { dataset, idx, activeLayer, refreshLayers, showToast } from '../lib/stores.js'
  import { setEntry } from '../lib/layers/store.js'
  import { makeQuiz } from '../lib/quiz/questions.js'

  let questions = $state(makeQuiz($dataset, $idx, tacticGoals))
  let i = $state(0)
  let picked = $state(null)
  let score = $state(0)

  const q = $derived(questions[i])
  const done = $derived(i >= questions.length)

  const answer = (opt) => {
    if (picked !== null) return
    picked = opt
    if (opt === q.answer) { score++; if (q.techId && $activeLayer) markLearned() }
  }
  const next = () => { i++; picked = null }
  const restart = () => { questions = makeQuiz($dataset, $idx, tacticGoals); i = 0; picked = null; score = 0 }
  const markLearned = async () => {
    await setEntry($activeLayer.id, q.techId, { learned: true })
    await refreshLayers()
    showToast(`${q.techId} marked as learned`)
  }
</script>

<main>
  <h1>Quiz</h1>
  {#if !questions.length}
    <p class="muted">Not enough data to build a quiz.</p>
  {:else if done}
    <section class="card">
      <strong>{score} / {questions.length} correct</strong>
      <button type="button" class="btn" onclick={restart}>New quiz</button>
    </section>
  {:else}
    <p class="muted">Question {i + 1} of {questions.length}</p>
    <section class="card">
      <p class="prompt">{q.prompt}</p>
      {#each q.options as opt}
        <button type="button" class="opt" class:right={picked !== null && opt === q.answer} class:wrong={opt === picked && opt !== q.answer} disabled={picked !== null} onclick={() => answer(opt)}>{opt}</button>
      {/each}
      {#if picked !== null}
        <p role="status">{picked === q.answer ? 'Correct!' : `Not quite: ${q.answer}`}</p>
        <button type="button" class="btn" onclick={next}>{i + 1 === questions.length ? 'See score' : 'Next'}</button>
      {/if}
    </section>
  {/if}
</main>

<style>
  main { padding: 24px 20px 32px; }
  h1 { font-size: 32px; margin: 0 0 4px; }
  .muted { color: var(--muted); margin: 0; }
  .card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px; margin-top: var(--gap); }
  .prompt { font-weight: 600; margin: 0 0 var(--gap); }
  .opt, .btn { display: block; width: 100%; min-height: 48px; margin-top: var(--gap); border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: inherit; font: inherit; text-align: left; padding: 0 14px; cursor: pointer; }
  .btn { background: var(--accent); color: var(--bg); border: 0; font-weight: 700; text-align: center; }
  .right { border-color: var(--accent); background: var(--accent-tint); }
  .wrong { border-style: dashed; text-decoration: line-through; }
</style>
