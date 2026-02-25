import { test, expect } from '@playwright/test'

// These tests run WITHOUT stored auth (they test login itself)
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Authentication & Login', () => {
  test.describe('Login Form', () => {
    test('valid credentials redirect to /dashboard', async ({ page }) => {
      await page.goto('/login')
      await page.fill('#email', 'himanshu@thevasa.com')
      await page.fill('#password', 'kumjZ2zdaq.H2C3')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard', { timeout: 30_000 })
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('invalid credentials show error message', async ({ page }) => {
      await page.goto('/login')
      await page.fill('#email', 'wrong@example.com')
      await page.fill('#password', 'wrongpassword123')
      await page.click('button[type="submit"]')

      const errorMessage = page.locator('.text-destructive')
      await expect(errorMessage).toBeVisible({ timeout: 10_000 })
      await expect(errorMessage).not.toBeEmpty()
    })

    test('empty email field has required attribute for HTML5 validation', async ({ page }) => {
      await page.goto('/login')
      const emailInput = page.locator('#email')
      await expect(emailInput).toHaveAttribute('required', '')
    })

    test('empty password field has required attribute for HTML5 validation', async ({ page }) => {
      await page.goto('/login')
      const passwordInput = page.locator('#password')
      await expect(passwordInput).toHaveAttribute('required', '')
    })

    test('button shows "Signing in..." spinner during submission', async ({ page }) => {
      await page.goto('/login')
      await page.fill('#email', 'himanshu@thevasa.com')
      await page.fill('#password', 'kumjZ2zdaq.H2C3')

      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toHaveText('Sign in')

      await submitButton.click()

      // Button should show spinner text and be disabled while submitting
      await expect(submitButton).toContainText('Signing in')
      await expect(submitButton).toBeDisabled()
    })
  })

  test.describe('Route Protection', () => {
    const protectedRoutes = [
      '/dashboard',
      '/purchase-orders',
      '/suppliers',
      '/products',
      '/inventory',
      '/production',
      '/finance',
      '/external-vendors',
      '/admin',
      '/profile',
    ]

    for (const route of protectedRoutes) {
      test(`unauthenticated visit to ${route} redirects to /login`, async ({ page }) => {
        await page.goto(route)
        await page.waitForURL('**/login', { timeout: 10_000 })
        await expect(page).toHaveURL(/\/login/)
      })
    }
  })

  test.describe('Authenticated Redirect', () => {
    test('authenticated user visiting /login redirects to /dashboard', async ({ page }) => {
      // First, log in to establish a session
      await page.goto('/login')
      await page.fill('#email', 'himanshu@thevasa.com')
      await page.fill('#password', 'kumjZ2zdaq.H2C3')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard', { timeout: 30_000 })

      // Now visit /login again - should redirect back to /dashboard
      await page.goto('/login')
      await page.waitForURL('**/dashboard', { timeout: 10_000 })
      await expect(page).toHaveURL(/\/dashboard/)
    })
  })
})
