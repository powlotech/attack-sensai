import { expect } from '@playwright/test'

/** Skip the intro and land on Learn. */
export async function skipIntro(page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Skip intro' }).click()
  await expect(page).toHaveURL(/#\/learn/)
}

/** Open a technique page directly and wait for the score buttons. */
export async function openTechnique(page, id) {
  await page.goto(`./#/technique/${id}`)
  await expect(page.getByRole('button', { name: '3', exact: true })).toBeVisible()
}

/** Bottom tab bar link (names like "Search" also match page content). */
export const tab = (page, name) => page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name })
