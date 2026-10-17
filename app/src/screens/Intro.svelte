<script>
  import { idx } from '../lib/stores.js'
  import { navigate } from '../lib/router.js'

  let step = $state(0)
  const count = $derived($idx ? $idx.topByTactic.size : 15)
  const steps = [
    {
      title: 'ATT&CK is a map of how real attackers work',
      body: 'MITRE built it from public reports of real intrusions. It breaks an attack into goals (tactics) and the methods used to reach them (techniques).',
      next: 'Next: tactics vs techniques',
    },
    {
      title: 'Tactics are the why, techniques are the how',
      body: 'A tactic is what the attacker wants right now. A technique is one way to get it, and many techniques have more specific sub-techniques.',
      next: 'Next: your own scores',
    },
    {
      title: 'Score what you learn',
      body: 'Give each technique a score from 0 to 4 and add notes. Your scores live in layers on this device, and you can export them to ATT&CK Navigator.',
      next: 'Start learning',
    },
  ]
  const s = $derived(steps[step])

  function finish() {
    try {
      localStorage.setItem('introSeen', '1')
    } catch {
      // storage blocked: the intro will show again next launch
    }
    navigate('/learn')
  }
</script>

<main>
  <header>
    <span class="muted">{step + 1} of {steps.length}</span>
    <button type="button" class="link" onclick={finish}>Skip intro</button>
  </header>

  <div class="bars" aria-hidden="true">
    {#each Array(count) as _, i}
      <span style="opacity: {0.15 + (0.85 * i) / (count - 1)}"></span>
    {/each}
  </div>
  <p class="muted ends"><span>Reconnaissance</span><span>→ {count} goals →</span><span>Impact</span></p>

  <h1>{s.title}</h1>
  <p class="body">{s.body}</p>

  {#if step === 0}
    <section class="example">
      <h2>EXAMPLE</h2>
      <p class="muted">Goal (tactic)</p>
      <p><strong>Persistence: stay in after a reboot</strong></p>
      <p class="muted">Method (technique)</p>
      <p><strong>Scheduled Task/Job <code>T1053</code></strong></p>
    </section>
  {/if}

  <footer>
    <div class="dots" aria-hidden="true">
      {#each steps as _, i}<i class:on={i === step}></i>{/each}
    </div>
    <button type="button" class="primary" onclick={() => (step < steps.length - 1 ? step++ : finish())}>{s.next}</button>
  </footer>
</main>

<style>
  main { min-height: 100dvh; padding: 24px 24px calc(24px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; }
  header { display: flex; justify-content: space-between; align-items: center; }
  .muted { color: var(--muted); margin: 0; }
  .link { background: none; border: 0; padding: 0 4px; cursor: pointer; }
  .bars { display: flex; gap: 4px; height: 44px; margin-top: 48px; }
  .bars span { flex: 1; background: var(--accent); border-radius: 6px; }
  .ends { display: flex; justify-content: space-between; font-size: 14px; margin-top: 6px; }
  h1 { font-size: 28px; line-height: 1.2; margin: 28px 0 12px; }
  .body { font-size: 18px; color: var(--muted); margin: 0 0 24px; }
  .example { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 16px; }
  .example h2 { font-size: 13px; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 8px; }
  .example p { margin: 0 0 8px; }
  footer { margin-top: auto; padding-top: 24px; }
  .dots { display: flex; justify-content: center; gap: 8px; margin-bottom: 16px; }
  .dots i { width: 8px; height: 8px; border-radius: 4px; background: var(--border); }
  .dots i.on { width: 24px; background: var(--accent); }
  .primary { width: 100%; min-height: 56px; border: 0; border-radius: 16px; background: var(--accent); color: var(--bg); font-weight: 600; font-size: 17px; cursor: pointer; }
</style>
