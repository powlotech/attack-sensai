import { test, expect } from '@playwright/test'
import { skipIntro, openTechnique } from './helpers.js'

test('compare a reference layer with mine, then save the gaps as a layer', async ({ page }) => {
  await skipIntro(page)
  await openTechnique(page, 'T1059.001')
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('button', { name: /^←/ }).click()
  await openTechnique(page, 'T1566')
  await page.getByRole('button', { name: '2', exact: true }).click()
  await page.getByRole('button', { name: /^←/ }).click()

  await page.goto('./#/layers')
  await page.getByRole('button', { name: '+ New' }).click()
  await page.getByRole('textbox').fill('Mine')
  await page.getByRole('button', { name: 'Create' }).click()
  await openTechnique(page, 'T1566')
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('button', { name: /^←/ }).click()

  await page.goto('./#/layers')
  await page.getByRole('button', { name: 'Layer actions for Learning progress' }).click()
  await page.getByRole('menuitem', { name: 'Compare…' }).click()
  await expect(page.getByText('1 of 2 techniques are gaps')).toBeVisible()
  await expect(page.locator('li', { hasText: 'T1059.001' })).toBeVisible()
  await page.getByRole('tab', { name: /Covered/ }).click()
  await expect(page.locator('li', { hasText: 'T1566' })).toBeVisible()

  await page.getByRole('tab', { name: /Gaps/ }).click()
  await page.getByRole('button', { name: 'Save gaps as layer' }).click()
  await expect(page.locator('.card', { hasText: 'Gaps vs Learning progress' })).toBeVisible()
})
