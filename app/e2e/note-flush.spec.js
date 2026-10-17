import { test, expect } from '@playwright/test'
import { skipIntro, openTechnique } from './helpers.js'

test('a note typed right before leaving the page is saved', async ({ page }) => {
  await skipIntro(page)
  await openTechnique(page, 'T1059.001')
  await page.getByPlaceholder('Notes').fill('flush me')
  await page.getByRole('button', { name: /^←/ }).click() // well inside the 500 ms debounce
  await openTechnique(page, 'T1059.001')
  await expect(page.getByPlaceholder('Notes')).toHaveValue('flush me')
})
