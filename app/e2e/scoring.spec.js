import { test, expect } from '@playwright/test'
import { skipIntro, tab } from './helpers.js'

test('score a sub-technique and see it in list, overview and progress', async ({ page }) => {
  await skipIntro(page)
  await page.locator('a.tactic', { hasText: 'Execution' }).click()
  const row = page.locator('.row', { hasText: 'T1059' }).first()
  await row.getByRole('button', { name: '+ subs' }).click()
  await page.locator('a.row.sub', { hasText: 'PowerShell' }).click()
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByLabel('Learned it').check()
  await page.getByPlaceholder('Notes').fill('test')
  await page.waitForTimeout(700) // debounce
  await page.getByRole('button', { name: /^←/ }).click()
  await page.locator('.row', { hasText: 'T1059' }).first().getByRole('button', { name: /subs/ }).click()
  await expect(page.locator('a.row.sub', { hasText: 'PowerShell' }).getByLabel('Score 3')).toBeVisible()

  await page.getByRole('tab', { name: 'Overview' }).click()
  await expect(page.locator('[aria-label*="Execution"][aria-label*="1 of"]')).toBeVisible()

  await tab(page, 'Learn').click()
  await expect(page.getByText('1 techniques learned')).toBeVisible()
})
