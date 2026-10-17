import { test, expect } from '@playwright/test'
import { skipIntro, openTechnique } from './helpers.js'

test('steps set on techniques appear in order in the Matrix timeline', async ({ page }) => {
  await skipIntro(page)
  await openTechnique(page, 'T1059.001')
  await page.getByLabel('Step #').fill('2')
  await page.getByLabel('When').fill('03:12 UTC')
  await page.getByRole('button', { name: /^←/ }).click() // blur saves the field

  await openTechnique(page, 'T1566')
  await page.getByLabel('Step #').fill('1')
  await page.getByRole('button', { name: /^←/ }).click()

  await page.goto('./#/matrix?view=timeline')
  const items = page.locator('ol li')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('T1566')
  await expect(items.nth(1)).toContainText('T1059.001')
  await expect(items.nth(1)).toContainText('03:12 UTC')
})
