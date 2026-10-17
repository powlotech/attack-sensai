<script>
  let { score = 0, size = 56 } = $props()
</script>

<span class="sq" class:zero={score === 0} style="--s: {size}px; background: var(--score-{score}); color: var(--score-{score}-text)" aria-label="Score {score}">{score}</span>

<style>
  .sq {
    flex: none; width: var(--s); height: calc(var(--s) * 0.78); border-radius: 10px;
    display: grid; place-items: center; font-weight: 700; font-size: 17px;
  }
  .zero { border: 1.5px solid var(--score-0-border); }
</style>
