import { test, expect } from '@playwright/test'

test.describe('Finance Module', () => {
  test.describe('Finance Hub', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/finance')
      await page.waitForLoadState('networkidle')
    })

    test('shows page header with title and description', async ({ page }) => {
      await expect(page.getByText('Finance').first()).toBeVisible()
      await expect(
        page.getByText('Manage reconciliation, payments, settlements, and invoices')
      ).toBeVisible()
    })

    test('shows navigation cards: Reconciliation, Payments, Settlements, Invoices', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Reconciliation' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Settlements' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
    })

    test('Reconciliation card has correct description', async ({ page }) => {
      await expect(page.getByText('PO, GRN & invoice matching')).toBeVisible()
    })

    test('Payments card has correct description', async ({ page }) => {
      await expect(page.getByText('Supplier payments')).toBeVisible()
    })

    test('Settlements and Invoices show Coming soon', async ({ page }) => {
      const comingSoon = page.getByText('Coming soon')
      const count = await comingSoon.count()
      expect(count).toBe(2)
    })

    test('Reconciliation card links to /finance/reconciliation', async ({ page }) => {
      const reconciliationLink = page.getByRole('link', { name: /Reconciliation/i }).first()
      await expect(reconciliationLink).toHaveAttribute('href', '/finance/reconciliation')
    })

    test('Payments card links to /finance/payments', async ({ page }) => {
      const paymentsLink = page.getByRole('link', { name: /Payments/i }).first()
      await expect(paymentsLink).toHaveAttribute('href', '/finance/payments')
    })
  })

  test.describe('Reconciliation List', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/finance/reconciliation')
      await page.waitForLoadState('networkidle')
    })

    test('shows page header with title', async ({ page }) => {
      await expect(page.getByText('Reconciliation').first()).toBeVisible()
      await expect(
        page.getByText('Match PO amounts with GRN receipts and supplier invoices')
      ).toBeVisible()
    })

    test('shows reconciliation table or empty state', async ({ page }) => {
      const table = page.locator('table')
      const emptyMsg = page.getByText('No purchase orders pending reconciliation')

      const hasTable = await table.isVisible().catch(() => false)
      const hasEmpty = await emptyMsg.isVisible().catch(() => false)

      expect(hasTable || hasEmpty).toBeTruthy()
    })

    test('has search input', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search PO number or supplier...')
      await expect(searchInput).toBeVisible()
    })
  })

  test.describe('Payments List', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/finance/payments')
      await page.waitForLoadState('networkidle')
    })

    test('shows page header with title', async ({ page }) => {
      await expect(page.getByText('Payments').first()).toBeVisible()
      await expect(page.getByText('Manage supplier payments')).toBeVisible()
    })

    test('shows payments table or empty state', async ({ page }) => {
      const table = page.locator('table')
      const emptyMsg = page.getByText('No payments found')

      const hasTable = await table.isVisible().catch(() => false)
      const hasEmpty = await emptyMsg.isVisible().catch(() => false)

      expect(hasTable || hasEmpty).toBeTruthy()
    })

    test('has search input for payments', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search payments...')
      await expect(searchInput).toBeVisible()
    })

    test('has status filter dropdown', async ({ page }) => {
      const statusTrigger = page.getByRole('combobox')
      await expect(statusTrigger).toBeVisible()

      // Open the dropdown and verify it has status options
      await statusTrigger.click()
      await expect(page.getByRole('option', { name: /All Statuses/i })).toBeVisible()
    })
  })

  test.describe('Entity Payment Pages', () => {
    test('Fulton payments page loads at /finance/fulton', async ({ page }) => {
      await page.goto('/finance/fulton')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, [role="main"]').first()
      await expect(content).toBeVisible()
      await expect(page.getByText(/Fulton/i).first()).toBeVisible()
    })

    test('MSE payments page loads at /finance/mse', async ({ page }) => {
      await page.goto('/finance/mse')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, [role="main"]').first()
      await expect(content).toBeVisible()
      await expect(page.getByText(/MSE/i).first()).toBeVisible()
    })

    test('SNA payments page loads at /finance/sna', async ({ page }) => {
      await page.goto('/finance/sna')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, [role="main"]').first()
      await expect(content).toBeVisible()
      await expect(page.getByText(/SNA/i).first()).toBeVisible()
    })
  })

  test.describe('Admin Payment Approvals', () => {
    test('Payment approvals page loads at /admin/approvals/payments', async ({ page }) => {
      await page.goto('/admin/approvals/payments')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('Payment Approvals')).toBeVisible()
      await expect(
        page.getByText('Review and approve payment requests')
      ).toBeVisible()
    })

    test('shows pending approvals table or empty state', async ({ page }) => {
      await page.goto('/admin/approvals/payments')
      await page.waitForLoadState('networkidle')

      const table = page.locator('table')
      const emptyState = page.getByText('No pending approvals')

      const hasTable = await table.isVisible().catch(() => false)
      const hasEmpty = await emptyState.isVisible().catch(() => false)

      expect(hasTable || hasEmpty).toBeTruthy()
    })
  })

  test.describe('Finance Stub Pages', () => {
    test('Settlements page shows placeholder content', async ({ page }) => {
      await page.goto('/finance/settlements')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('Marketplace Settlements')).toBeVisible()
      await expect(page.getByText('No settlements')).toBeVisible()
      await expect(
        page.getByText('Marketplace settlements will appear here when recorded.')
      ).toBeVisible()
    })

    test('Invoices page shows placeholder content', async ({ page }) => {
      await page.goto('/finance/invoices')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('Customer Invoices')).toBeVisible()
      await expect(page.getByText('No invoices')).toBeVisible()
      await expect(
        page.getByText('Customer invoices will appear here when created.')
      ).toBeVisible()
    })
  })

  test.describe('Finance API', () => {
    test('GET /api/finance/payments returns paginated data', async ({ page }) => {
      await page.goto('/finance')
      await page.waitForLoadState('networkidle')

      const result = await page.evaluate(async () => {
        const res = await fetch('/api/finance/payments')
        return { status: res.status, data: await res.json() }
      })

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('data')
      expect(Array.isArray(result.data.data)).toBeTruthy()
    })
  })
})
