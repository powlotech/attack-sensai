import { test, expect } from '@playwright/test'
import { skipIntro, openTechnique, tab } from './helpers.js'

test('progress file exports and re-imports as a merge', async ({ page }) => {
  await skipIntro(page)
  await openTechnique(page, 'T1059.001')
  await page.getByRole('button', { name: '4', exact: true }).click()
  await page.waitForTimeout(700)
  await tab(page, 'Settings').click()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export file' }).click()])
  await page.locator('input[type=file]').setInputFiles(await dl.path())
  await expect(page.locator('.toast')).toContainText('Merged')
  await expect(page.getByRole('button', { name: 'Sync with GitHub' })).toBeVisible()
})
