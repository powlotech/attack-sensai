import { expect, test, vi } from 'vitest'
import { debounce } from './debounce.js'

test('call waits, then runs once with the last args', () => {
  vi.useFakeTimers()
  const fn = vi.fn()
  const d = debounce(fn, 500)
  d.call(1)
  d.call(2)
  vi.advanceTimersByTime(499)
  expect(fn).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(fn).toHaveBeenCalledTimes(1)
  expect(fn).toHaveBeenCalledWith(2)
  vi.useRealTimers()
})

test('flush runs a pending call immediately, exactly once (Review Focus 5)', () => {
  vi.useFakeTimers()
  const fn = vi.fn()
  const d = debounce(fn, 500)
  d.call('note')
  d.flush()
  d.flush()
  vi.advanceTimersByTime(1000)
  expect(fn).toHaveBeenCalledTimes(1)
  expect(fn).toHaveBeenCalledWith('note')
  vi.useRealTimers()
})

test('cancel drops the pending call', () => {
  vi.useFakeTimers()
  const fn = vi.fn()
  const d = debounce(fn, 500)
  d.call()
  d.cancel()
  d.flush()
  vi.advanceTimersByTime(1000)
  expect(fn).not.toHaveBeenCalled()
  vi.useRealTimers()
})
