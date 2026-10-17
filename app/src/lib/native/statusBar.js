/** Match the Android status bar to the app theme. No-op in a browser. */
export async function syncStatusBar(resolved) {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) return
  const { StatusBar, Style } = await import('@capacitor/status-bar')
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  await StatusBar.setStyle({ style: resolved === 'dark' ? Style.Dark : Style.Light })
  await StatusBar.setBackgroundColor({ color: bg })
}
