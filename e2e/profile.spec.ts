import { test, expect } from '@playwright/test'
import { navigateTo } from '../e2e/helpers'

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/profile')
  })

  test.describe('Personal Information', () => {
    test('profile page loads with user name and email displayed', async ({ page }) => {
      // Wait for the profile to finish loading (loading spinner should disappear)
      await expect(page.locator('text=Personal Information')).toBeVisible({ timeout: 15_000 })

      // Name field should have a value (not empty)
      const nameInput = page.locator('#name')
      await expect(nameInput).toBeVisible()
      const nameValue = await nameInput.inputValue()
      expect(nameValue.length).toBeGreaterThan(0)

      // Email field should have a value (not empty)
      const emailInput = page.locator('#email')
      await expect(emailInput).toBeVisible()
      const emailValue = await emailInput.inputValue()
      expect(emailValue).toContain('@')
    })

    test('name field is editable, email field is disabled', async ({ page }) => {
      await expect(page.locator('text=Personal Information')).toBeVisible({ timeout: 15_000 })

      const nameInput = page.locator('#name')
      const emailInput = page.locator('#email')

      // Name should be editable (not disabled)
      await expect(nameInput).toBeEnabled()

      // Email should be disabled
      await expect(emailInput).toBeDisabled()

      // The helper text should indicate email cannot be changed
      await expect(page.getByText('Email cannot be changed')).toBeVisible()
    })
  })

  test.describe('Account Information', () => {
    test('account info section shows status badge and created date', async ({ page }) => {
      await expect(page.locator('text=Account Information')).toBeVisible({ timeout: 15_000 })

      // Status badge should be visible (Active or Inactive)
      const statusBadge = page.locator('text=Account Information').locator('..').locator('..').locator('[class*="badge"]')
      await expect(statusBadge).toBeVisible()

      // Should show "Account Status" label
      await expect(page.getByText('Account Status')).toBeVisible()

      // Should show "Account Created" label with a date
      await expect(page.getByText('Account Created')).toBeVisible()
    })
  })

  test.describe('Change Password', () => {
    test('change password section has 3 password fields', async ({ page }) => {
      await expect(page.locator('text=Change Password').first()).toBeVisible({ timeout: 15_000 })

      const currentPasswordInput = page.locator('#currentPassword')
      const newPasswordInput = page.locator('#newPassword')
      const confirmPasswordInput = page.locator('#confirmPassword')

      await expect(currentPasswordInput).toBeVisible()
      await expect(newPasswordInput).toBeVisible()
      await expect(confirmPasswordInput).toBeVisible()

      // All three should be password type by default
      await expect(currentPasswordInput).toHaveAttribute('type', 'password')
      await expect(newPasswordInput).toHaveAttribute('type', 'password')
      await expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    })

    test('password strength rules are displayed when typing new password', async ({ page }) => {
      await expect(page.locator('text=Change Password').first()).toBeVisible({ timeout: 15_000 })

      // Type something into the new password field to trigger the requirements display
      const newPasswordInput = page.locator('#newPassword')
      await newPasswordInput.fill('test')

      // Password Requirements section should appear
      await expect(page.getByText('Password Requirements:')).toBeVisible()

      // All 5 strength rules should be displayed
      await expect(page.getByText('At least 12 characters')).toBeVisible()
      await expect(page.getByText('One uppercase letter')).toBeVisible()
      await expect(page.getByText('One lowercase letter')).toBeVisible()
      await expect(page.getByText('One number')).toBeVisible()
      await expect(page.getByText('One special character')).toBeVisible()
    })
  })
})
