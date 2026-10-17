import { test, expect } from '@playwright/test'
import { skipIntro, openTechnique } from './helpers.js'
import { readFileSync } from 'node:fs'

test('export, delete, re-import restores scores; unsupported domain is rejected', async ({ page }) => {
  await skipIntro(page)
  await openTechnique(page, 'T1059.001')
  await page.getByRole('button', { name: '4', exact: true }).click()
  await page.getByPlaceholder('Notes').fill('keep this')
  await page.waitForTimeout(700)

  await page.goto('./#/layers')
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Share / export active layer' }).click(),
  ])
  const path = await dl.path()

  await page.getByRole('button', { name: /Layer actions for/ }).first().click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete' }).last().click()

  await page.locator('input[type=file]').setInputFiles(path)
  await expect(page.locator('.toast')).toContainText('Imported')
  await openTechnique(page, 'T1059.001')
  await expect(page.getByRole('button', { name: '4', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByPlaceholder('Notes')).toHaveValue('keep this')

  await page.goto('./#/layers')
  const bad = JSON.parse(readFileSync(path, 'utf8'))
  bad.domain = 'pre-attack'
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad)) })
  await expect(page.locator('.toast')).toContainText(/Enterprise/)
})
