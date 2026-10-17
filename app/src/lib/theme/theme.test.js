import { beforeEach, expect, test } from 'vitest'
import { getThemePref, resolveTheme, setThemePref } from './theme.js'

test.each([
  ['system', true, 'dark'],
  ['system', false, 'light'],
  ['light', true, 'light'],
  ['light', false, 'light'],
  ['dark', true, 'dark'],
  ['dark', false, 'dark'],
])('resolveTheme(%s, systemDark=%s) -> %s', (pref, sys, want) => {
  expect(resolveTheme(pref, sys)).toBe(want)
})

beforeEach(() => localStorage.clear())
test('pref defaults to system and round-trips', () => {
  expect(getThemePref()).toBe('system')
  setThemePref('dark')
  expect(getThemePref()).toBe('dark')
})
test('a junk stored value falls back to system', () => {
  localStorage.setItem('theme', 'neon')
  expect(getThemePref()).toBe('system')
})
