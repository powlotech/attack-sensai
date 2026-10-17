<script>
  import tacticGoals from '../lib/content/tactics.json'
  import { dataset, activeLayer } from '../lib/stores.js'
  import { daily, currentStreak } from '../lib/daily.js'
  import { navigate } from '../lib/router.js'

  const learned = $derived(Object.values($activeLayer?.entries ?? {}).filter((e) => e.learned).length)
  const total = $derived($dataset?.techniques.length ?? 0)
  const firstSentence = (s) => s.split(/(?<=\.)\s/)[0]
</script>

<main>
  <h1>Learn</h1>
  <p class="muted">The {$dataset?.tactics.length} attacker goals, in the order an attack usually unfolds.</p>

  <a class="card" href="#/coverage">
    <div class="row"><strong>Your progress</strong><span class="muted">{learned} techniques learned</span></div>
    <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax={total} aria-valuenow={learned} aria-label="Techniques learned">
      <span style="width: {total ? (100 * learned) / total : 0}%"></span>
    </div>
    <span class="muted detail">Detailed Progress ›</span>
  </a>

  <a class="card" href="#/daily"><div class="row"><strong>Daily question</strong><span class="muted">🔥 {currentStreak($daily)} day streak</span></div></a>

  <button type="button" class="quiz" onclick={() => navigate('/quiz')}>Take a quiz</button>

  {#each $dataset?.tactics ?? [] as t, i}
    <a class="card tactic" href="#/matrix?tactic={t.shortname}">
      <span class="n">{i + 1}</span>
      <span class="txt">
        <strong>{t.name}</strong> <code class="muted">{t.id}</code>
        <span class="muted goal">{tacticGoals[t.shortname] ?? firstSentence(t.description)}</span>
      </span>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
    </a>
  {/each}

  <button type="button" class="link replay" onclick={() => navigate('/intro')}>Replay the intro</button>
</main>

<style>
  main { padding: 24px 20px 32px; }
  h1 { font-size: 32px; margin: 0 0 4px; }
  .muted { color: var(--muted); margin: 0; }
  .card { display: block; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 16px; margin-top: 12px; }
  a.card { color: inherit; text-decoration: none; }
  .detail { display: block; text-align: right; }
  .row { display: flex; justify-content: space-between; align-items: baseline; }
  .track { height: 8px; border-radius: 4px; background: var(--border); margin: 12px 0; overflow: hidden; }
  .track span { display: block; height: 100%; background: var(--accent); }
  .link { background: none; border: 0; padding: 0; cursor: pointer; }
  .quiz { display: block; width: 100%; min-height: 56px; margin-top: 12px; border: 0; border-radius: 18px; background: var(--accent); color: var(--bg); font: inherit; font-size: 18px; font-weight: 700; cursor: pointer; }
  .replay { display: block; margin: 32px auto 0; min-height: 44px; color: var(--muted); }
  .tactic { display: flex; align-items: center; gap: 14px; color: inherit; text-decoration: none; min-height: 72px; }
  .n { flex: none; width: 40px; height: 40px; border-radius: 50%; background: var(--accent-tint); color: var(--accent); font-weight: 700; display: grid; place-items: center; }
  .txt { flex: 1; }
  .goal { display: block; }
  code { font-size: 13px; }
</style>
