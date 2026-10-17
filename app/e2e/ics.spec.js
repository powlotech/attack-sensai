import { test, expect } from '@playwright/test'
import { skipIntro, tab } from './helpers.js'

test('switch to the ICS matrix: 12 tactics, own layers, export domain; Enterprise comes back', async ({ page }) => {
  await skipIntro(page)
  await page.goto('./#/layers')
  await page.getByRole('button', { name: 'ICS', exact: true }).click()
  await expect(page.locator('.toast')).toContainText('ICS')
  await expect(page.locator('.card strong', { hasText: 'Learning progress' })).toHaveCount(1)

  await tab(page, 'Learn').click()
  await expect(page.getByText('The 12 attacker goals')).toBeVisible()
  await page.goto('./#/search?q=T0800&kind=techniques')
  await expect(page.locator('body')).toContainText('T0800')

  await page.goto('./#/layers')
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Share / export active layer' }).click(),
  ])
  expect(JSON.parse(await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8')).domain).toBe('ics-attack')

  await page.reload() // choice is remembered
  await tab(page, 'Learn').click()
  await expect(page.getByText('The 12 attacker goals')).toBeVisible()

  await page.goto('./#/layers')
  await page.getByRole('button', { name: 'Enterprise', exact: true }).click()
  await tab(page, 'Learn').click()
  await expect(page.getByText('The 15 attacker goals')).toBeVisible()
})
