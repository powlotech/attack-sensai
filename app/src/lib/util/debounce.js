/** Delay fn until `ms` after the last call(); flush() runs a pending call now, cancel() drops it. */
export function debounce(fn, ms) {
  let timer = null
  let pending = null
  const run = () => {
    const args = pending
    timer = pending = null
    if (args) fn(...args)
  }
  return {
    call(...args) {
      pending = args
      clearTimeout(timer)
      timer = setTimeout(run, ms)
    },
    flush() {
      clearTimeout(timer)
      run()
    },
    cancel() {
      clearTimeout(timer)
      timer = pending = null
    },
  }
}
