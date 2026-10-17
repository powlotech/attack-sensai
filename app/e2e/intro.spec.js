import { test, expect } from '@playwright/test'
import { skipIntro } from './helpers.js'

test('first visit shows intro; skip lands on Learn; reload keeps it skipped', async ({ page }) => {
  await skipIntro(page)
  // 15 tactics in ATT&CK v20 (spec said 14; see ledger ruling)
  await expect(page.locator('a.tactic')).toHaveCount(15)
  await page.reload()
  await expect(page).toHaveURL(/#\/learn/)
  await expect(page.locator('a.tactic')).toHaveCount(15)
})
