import { test, expect } from '@playwright/test'

// Minimal load smoke test. The full happy-path flow lives in wizard.spec.ts.
test('app loads on the decision step', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Decision Weigher' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your decision' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
})
