import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Full-page accessibility scans in a real browser, including COLOUR CONTRAST —
// the check jsdom cannot perform, and the class of bug that made the factor form
// unreadable. We assert zero WCAG 2 A/AA violations on each wizard screen.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function scan(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page }).withTags(WCAG).analyze()
}

test('decision step is accessible', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/title/i).fill('Which EV should I buy?')
  const results = await scan(page)
  expect(results.violations).toEqual([])
})

test('factors step is accessible (add form + a row)', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/title/i).fill('Car')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New factor name').fill('Reliability')
  await page.getByRole('button', { name: 'Add factor' }).click()
  const results = await scan(page)
  expect(results.violations).toEqual([])
})

test('alternatives step is accessible (with a rating)', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/title/i).fill('Car')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New factor name').fill('Reliability')
  await page.getByRole('button', { name: 'Add factor' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New alternative name').fill('Tesla Model 3')
  await page.getByRole('button', { name: 'Add alternative' }).click()
  await page.getByLabel(/Reliability rating for Tesla Model 3/).fill('8')
  const results = await scan(page)
  expect(results.violations).toEqual([])
})

test('results step is accessible (tabs, table)', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/title/i).fill('Car')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New factor name').fill('Reliability')
  await page.getByRole('button', { name: 'Add factor' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New alternative name').fill('Tesla Model 3')
  await page.getByRole('button', { name: 'Add alternative' }).click()
  await page.getByLabel(/Reliability rating for Tesla Model 3/).fill('8')
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible()

  // scan each tab
  for (const tab of ['Ranking', 'Breakdown', 'Sensitivity', 'Comparison']) {
    await page.getByRole('tab', { name: tab }).click()
    const results = await scan(page)
    expect(results.violations, `violations on the ${tab} tab`).toEqual([])
  }
})
