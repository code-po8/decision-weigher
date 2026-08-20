import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// DW-010 — full happy-path E2E for the plan's car example: multiple factors with
// different scales and directions, multiple alternatives rated across them, then
// the ranked results, the results tabs, JSON export, and re-import round-trip.

async function addFactor(
  page: Page,
  name: string,
  weight: string,
  direction: 'Higher is better' | 'Lower is better',
  scale: '0–10' | '0–100' | 'Yes / No',
) {
  await page.getByLabel('New factor name').fill(name)
  const weightField = page.getByLabel('New factor weight')
  await weightField.fill(weight)
  await page.getByLabel('New factor direction').selectOption({ label: direction })
  await page.getByLabel('New factor scale').selectOption({ label: scale })
  await page.getByRole('button', { name: 'Add factor' }).click()
}

test('rank three cars across weighted factors, then export', async ({ page }) => {
  await page.goto('/')

  // 1. Decision
  await page.getByLabel(/title/i).fill('Which EV should I buy?')
  await page.getByLabel(/description/i).fill('Comparing three electric cars.')
  await page.getByRole('button', { name: 'Next' }).click()

  // 2. Factors — mixed scales + directions
  await expect(page.getByRole('heading', { name: 'Factors' })).toBeVisible()
  await addFactor(page, 'Cost', '5', 'Lower is better', '0–100')
  await addFactor(page, 'Reliability', '5', 'Higher is better', '0–10')
  await addFactor(page, 'Range', '3', 'Higher is better', '0–100')
  await addFactor(page, 'NACS charging', '2', 'Higher is better', 'Yes / No')
  await expect(page.getByRole('list', { name: 'Factors' }).getByRole('listitem')).toHaveCount(4)
  await page.getByRole('button', { name: 'Next' }).click()

  // 3. Alternatives + ratings
  await expect(page.getByRole('heading', { name: 'Alternatives' })).toBeVisible()

  const rate = async (car: string, cost: string, rel: string, range: string, nacs: boolean) => {
    await page.getByLabel('New alternative name').fill(car)
    await page.getByRole('button', { name: 'Add alternative' }).click()
    await page.getByLabel(`Cost rating for ${car}`).fill(cost)
    await page.getByLabel(`Reliability rating for ${car}`).fill(rel)
    await page.getByLabel(`Range rating for ${car}`).fill(range)
    if (nacs) await page.getByLabel(`NACS charging rating for ${car}`).check()
  }

  await rate('Tesla Model 3', '45', '8', '70', true)
  await rate('Ford Mustang Mach-E', '55', '7', '65', true)
  await rate('Nissan Leaf', '30', '7', '40', false)

  await page.getByRole('button', { name: 'Next' }).click()

  // 4. Results — ranking present, winner badge, three ranked items
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible()
  const ranking = page.getByRole('list', { name: 'Ranking' })
  await expect(ranking.getByRole('listitem')).toHaveCount(3)
  await expect(ranking.getByText('Winner')).toHaveCount(1)

  // Tabs
  await page.getByRole('tab', { name: 'Breakdown' }).click()
  await expect(page.getByRole('img', { name: /Contribution breakdown for/ }).first()).toBeVisible()
  await page.getByRole('tab', { name: 'Comparison' }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByText('Yes')).toHaveCount(2) // two cars with NACS
  await page.getByRole('tab', { name: 'Sensitivity' }).click()
  await expect(page.getByText(/most influential factor/i)).toBeVisible()

  // 5. Export
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /export json/i }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('which-ev-should-i-buy.json')
})

test('uses real path-based routes and serves them directly', async ({ page }) => {
  // Advancing the wizard updates the URL path (BrowserRouter, not hash routing).
  await page.goto('/')
  await page.getByLabel(/title/i).fill('Car')
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page).toHaveURL(/\/factors$/)

  // The dev/static server resolves a direct visit to a route to the SPA. With a
  // fresh (empty) session the wizard guard sends an incomplete deep link back to
  // the first step — the correct behaviour for a session-only app.
  await page.goto('/factors')
  await expect(page.getByRole('heading', { name: 'Your decision' })).toBeVisible()
})

test('rejects a malformed import and keeps the current decision', async ({ page }) => {
  await page.goto('/')
  // Build the minimum to reach results.
  await page.getByLabel(/title/i).fill('Keep me')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New factor name').fill('Quality')
  await page.getByRole('button', { name: 'Add factor' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New alternative name').fill('Only Option')
  await page.getByRole('button', { name: 'Add alternative' }).click()
  await page.getByRole('button', { name: 'Next' }).click()

  // Import a malformed file via the hidden input.
  await page.getByLabel('Import decision file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('this is not json {'),
  })
  await expect(page.getByRole('alert')).toContainText(/import failed/i)
  // Ranking still shows the original alternative — decision was not replaced.
  await expect(page.getByRole('list', { name: 'Ranking' })).toContainText('Only Option')
})

test('restore a saved decision from the landing step, straight to results', async ({ page }) => {
  // Build + export a decision to get a real file, then reload to a fresh session.
  await page.goto('/')
  await page.getByLabel(/title/i).fill('Which EV should I buy?')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New factor name').fill('Reliability')
  await page.getByRole('button', { name: 'Add factor' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New alternative name').fill('Tesla Model 3')
  await page.getByRole('button', { name: 'Add alternative' }).click()
  await page.getByLabel(/Reliability rating for Tesla Model 3/).fill('9')
  await page.getByRole('button', { name: 'Next' }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /export json/i }).click()
  const download = await downloadPromise
  const savedPath = await download.path()

  // Simulate a returning user: fresh page, nothing entered yet.
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your decision' })).toBeVisible()

  // Restore directly from the landing step — without typing anything.
  await page.getByLabel('Import decision file').setInputFiles(savedPath)

  // Lands on results with the restored decision, no data entry required.
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Ranking' })).toContainText('Tesla Model 3')
})
