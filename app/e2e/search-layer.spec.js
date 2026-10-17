import { test, expect } from '@playwright/test'
import { skipIntro, tab } from './helpers.js'

test('search a group, save it as a layer, see it scored in the matrix', async ({ page }) => {
  await skipIntro(page)
  await tab(page, 'Search').click()
  await page.getByLabel('Search').fill('apt29')
  await page.getByRole('tab', { name: /Groups/ }).click()
  await page.getByRole('button', { name: 'Save as layer' }).first().click()
  await expect(page).toHaveURL(/#\/layers/)
  await expect(page.locator('.card.on', { hasText: 'APT29' })).toBeVisible()

  await page.goto('./#/matrix?tactic=execution')
  await expect(page.locator('.row [aria-label="Score 1"]').first()).toBeVisible()
})
