import { test, expect } from '@playwright/test'
import { navigateTo, waitForPageReady } from '../e2e/helpers'

test.describe('Navigation, Sidebar & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/dashboard')
  })

  test.describe('Sidebar', () => {
    test('sidebar is visible and contains nav links', async ({ page }) => {
      const sidebar = page.locator('aside').first()
      await expect(sidebar).toBeVisible()

      // Verify key top-level navigation items are present
      await expect(sidebar.getByText('Dashboard')).toBeVisible()
      await expect(sidebar.getByText('Purchase Orders')).toBeVisible()
      await expect(sidebar.getByText('Suppliers')).toBeVisible()
      await expect(sidebar.getByText('Products')).toBeVisible()
      await expect(sidebar.getByText('Inventory')).toBeVisible()
      await expect(sidebar.getByText('Production')).toBeVisible()
      await expect(sidebar.getByText('Finance')).toBeVisible()
    })

    test('expandable sections work - clicking Inventory reveals sub-items', async ({ page }) => {
      const sidebar = page.locator('aside').first()

      // Sub-items should not be visible before expanding
      await expect(sidebar.getByText('Stock Overview')).not.toBeVisible()
      await expect(sidebar.getByText('Goods Receipt')).not.toBeVisible()

      // Click the Inventory expandable button
      const inventoryButton = sidebar.getByText('Inventory')
      await inventoryButton.click()

      // Sub-items should now be visible
      await expect(sidebar.getByText('Stock Overview')).toBeVisible({ timeout: 5_000 })
      await expect(sidebar.getByText('Goods Receipt')).toBeVisible()
      await expect(sidebar.getByText('Stock Ledger')).toBeVisible()
    })

    test('logo links to /dashboard', async ({ page }) => {
      const sidebar = page.locator('aside').first()
      // The first link in the sidebar header is the logo link
      const logoLink = sidebar.locator('a').first()
      await expect(logoLink).toHaveAttribute('href', '/dashboard')
    })
  })

  test.describe('Header', () => {
    test('header is visible with user avatar', async ({ page }) => {
      const header = page.locator('header').first()
      await expect(header).toBeVisible()

      // User avatar button should be present in the header
      const avatarButton = header.locator('button').filter({ has: page.locator('[class*="avatar"]') })
      await expect(avatarButton).toBeVisible()
    })
  })

  test.describe('Direct Navigation', () => {
    const pages = [
      { path: '/suppliers', heading: 'Suppliers' },
      { path: '/products', heading: 'Product' },
      { path: '/purchase-orders', heading: 'Purchase Orders' },
      { path: '/inventory', heading: 'Inventory' },
      { path: '/production', heading: 'Production' },
      { path: '/finance', heading: 'Finance' },
      { path: '/admin/settings', heading: 'Settings' },
    ]

    for (const { path, heading } of pages) {
      test(`navigating to ${path} loads the page`, async ({ page }) => {
        await navigateTo(page, path)
        await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')))
        await expect(page.getByText(heading).first()).toBeVisible({ timeout: 10_000 })
      })
    }
  })

  test.describe('Active Route Highlighting', () => {
    test('navigating to /suppliers highlights the Suppliers link in sidebar', async ({ page }) => {
      await navigateTo(page, '/suppliers')

      const sidebar = page.locator('aside').first()
      const suppliersLink = sidebar.locator('a', { hasText: 'Suppliers' })

      // The active link should have the primary color styling (bg-primary/10 text-primary)
      await expect(suppliersLink).toHaveClass(/text-primary/)
    })
  })
})
