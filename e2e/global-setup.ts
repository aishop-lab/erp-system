import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authDir = path.join(__dirname, 'fixtures', '.auth')
const authFile = path.join(authDir, 'user.json')

setup('authenticate', async ({ page }) => {
  // Ensure auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  const email = process.env.TEST_USER_EMAIL || 'himanshu@thevasa.com'
  const password = process.env.TEST_USER_PASSWORD || 'kumjZ2zdaq.H2C3'

  // Go to login page
  await page.goto('/login')
  await expect(page.locator('text=ERP System')).toBeVisible()

  // Fill in credentials
  await page.fill('#email', email)
  await page.fill('#password', password)

  // Submit
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 30_000 })
  await expect(page).toHaveURL(/\/dashboard/)

  // Save auth state
  await page.context().storageState({ path: authFile })
})
