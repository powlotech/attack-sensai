/** Where version.json / attack.json are fetched from for updates (APK builds set an absolute Pages URL). */
export const DATA_BASE = import.meta.env.VITE_DATA_BASE ?? import.meta.env.BASE_URL + 'data/'
/** The copy shipped inside the app; always same-origin so first launch works offline. */
export const BUNDLED_BASE = import.meta.env.BASE_URL + 'data/'
export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
