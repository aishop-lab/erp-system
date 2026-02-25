import { Page, expect } from '@playwright/test'

/**
 * Shared test helpers for E2E tests.
 * Assumes tests run against a live server with seeded data.
 */

/** Wait for the page to finish loading (no pending network requests) */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle')
}

/** Navigate to a page and wait for it to be ready */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path)
  await waitForPageReady(page)
}

/** Execute an authenticated API call via the browser context */
export async function apiGet(page: Page, url: string) {
  return page.evaluate(async (fetchUrl) => {
    const res = await fetch(fetchUrl)
    return { status: res.status, data: await res.json() }
  }, url)
}

/** Execute an authenticated API POST call */
export async function apiPost(page: Page, url: string, body: Record<string, unknown>) {
  return page.evaluate(async ({ fetchUrl, fetchBody }) => {
    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fetchBody),
    })
    return { status: res.status, data: await res.json() }
  }, { fetchUrl: url, fetchBody: body })
}

/** Click a shadcn Select trigger and pick an option by text */
export async function selectOption(page: Page, triggerSelector: string, optionText: string) {
  await page.locator(triggerSelector).click()
  await page.getByRole('option', { name: optionText }).click()
}

/** Get the count of table rows (excluding header) */
export async function getTableRowCount(page: Page) {
  const rows = page.locator('table tbody tr')
  return rows.count()
}

/** Assert a toast or alert banner contains text */
export async function expectAlert(page: Page, text: string | RegExp) {
  await expect(
    page.locator('[role="alert"], .text-destructive, [data-state="open"]')
      .filter({ hasText: text })
      .first()
  ).toBeVisible({ timeout: 10_000 })
}

/** Fill a shadcn form field by label */
export async function fillField(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: false })
  await input.clear()
  await input.fill(value)
}

/** Generate a unique test identifier */
export function uniqueId(prefix: string = 'test') {
  return `${prefix}-${Date.now().toString(36)}`
}
