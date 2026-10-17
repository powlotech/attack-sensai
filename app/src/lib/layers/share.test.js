import { afterEach, expect, test, vi } from 'vitest'
import { shareOrDownload } from './share.js'

afterEach(() => vi.restoreAllMocks())

test('falls back to a Blob download when navigator.share is unavailable', async () => {
  vi.stubGlobal('navigator', { ...navigator, share: undefined })
  const create = vi.fn(() => 'blob:x')
  URL.createObjectURL = create
  URL.revokeObjectURL = vi.fn()
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  expect(await shareOrDownload('a.json', { x: 1 })).toBe('downloaded')
  expect(create).toHaveBeenCalledOnce()
  expect(click).toHaveBeenCalledOnce()
})
