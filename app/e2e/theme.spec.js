import { test, expect } from '@playwright/test'
import { skipIntro, tab } from './helpers.js'

test.use({ colorScheme: 'dark' })

test('dark follows the system; Light overrides it', async ({ page }) => {
  await skipIntro(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 17, 20)')
  await tab(page, 'Settings').click()
  await page.getByRole('radio', { name: 'Light' }).click()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(246, 247, 248)')
})
