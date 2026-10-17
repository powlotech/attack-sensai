const KEY = 'theme'
const PREFS = ['system', 'light', 'dark']

export const resolveTheme = (pref, systemDark) => (pref === 'system' ? (systemDark ? 'dark' : 'light') : pref)

export function getThemePref() {
  try {
    const v = localStorage.getItem(KEY)
    return PREFS.includes(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

export function setThemePref(pref) {
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    // private mode: the choice just doesn't persist
  }
}

/** Applies the theme to <html data-theme> now and whenever the OS setting changes. Returns an unsubscribe. */
export function startTheme(onChange) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = () => {
    const resolved = resolveTheme(getThemePref(), mq.matches)
    document.documentElement.dataset.theme = resolved
    onChange?.(resolved)
  }
  apply()
  mq.addEventListener('change', apply)
  return () => mq.removeEventListener('change', apply)
}
