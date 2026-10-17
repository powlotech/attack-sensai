import { test, expect } from '@playwright/test'
import { skipIntro } from './helpers.js'

test('app renders offline after the service worker is ready', async ({ page, context }) => {
  await skipIntro(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload() // let the SW take control and precache settle
  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('a.tactic')).toHaveCount(15)
})
