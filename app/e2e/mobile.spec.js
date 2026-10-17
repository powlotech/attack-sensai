import { test, expect } from '@playwright/test'
import { skipIntro, tab } from './helpers.js'

test('switch to the Mobile matrix and export its domain', async ({ page }) => {
  await skipIntro(page)
  await page.goto('./#/layers')
  await page.getByRole('button', { name: 'Mobile', exact: true }).click()
  await expect(page.locator('.toast')).toContainText('Mobile')
  await tab(page, 'Learn').click()
  await expect(page.getByText('The 12 attacker goals')).toBeVisible()
  await page.goto('./#/search?q=T1398&kind=techniques')
  await expect(page.locator('body')).toContainText('T1398')
  await page.goto('./#/layers')
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Share / export active layer' }).click(),
  ])
  expect(JSON.parse(await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8')).domain).toBe('mobile-attack')
})
