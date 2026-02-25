import { test, expect } from '@playwright/test'

test.describe('Inventory & GRN', () => {
  test.describe('Stock Overview', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/inventory')
      await page.waitForLoadState('networkidle')
    })

    test('displays page header with title and description', async ({ page }) => {
      await expect(page.getByText('Stock Overview')).toBeVisible()
      await expect(
        page.getByText('Current inventory levels across all products')
      ).toBeVisible()
    })

    test('shows summary cards: Total SKUs, Low Stock, Out of Stock, By Type', async ({ page }) => {
      await expect(page.getByText('Total SKUs')).toBeVisible()
      await expect(page.getByText('Low Stock')).toBeVisible()
      await expect(page.getByText('Out of Stock')).toBeVisible()
      await expect(page.getByText('By Type')).toBeVisible()
    })

    test('shows stock table or empty state', async ({ page }) => {
      const table = page.locator('table')
      const emptyState = page.getByText('No inventory data')
      const noMatches = page.getByText('No stock matches your filters')

      const hasTable = await table.isVisible().catch(() => false)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)
      const hasNoMatches = await noMatches.isVisible().catch(() => false)

      expect(hasTable || hasEmptyState || hasNoMatches).toBeTruthy()
    })

    test('Export CSV button is present', async ({ page }) => {
      const exportBtn = page.getByRole('button', { name: /Export CSV/i })
      await expect(exportBtn).toBeVisible()
    })

    test('product type filter dropdown is present', async ({ page }) => {
      await expect(page.getByText('Product Type')).toBeVisible()
      const trigger = page.getByRole('combobox').first()
      await expect(trigger).toBeVisible()
    })

    test('search input is present with correct placeholder', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search SKU or batch...')
      await expect(searchInput).toBeVisible()
    })
  })

  test.describe('GRN List', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/inventory/grn')
      await page.waitForLoadState('networkidle')
    })

    test('shows page header with title', async ({ page }) => {
      await expect(page.getByText('Goods Receipt Notes')).toBeVisible()
    })

    test('shows GRN table or empty state', async ({ page }) => {
      const table = page.locator('table')
      const emptyState = page.getByText('No goods receipts')

      const hasTable = await table.isVisible().catch(() => false)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      expect(hasTable || hasEmptyState).toBeTruthy()
    })

    test('New GRN button is present and navigates to /inventory/grn/new', async ({ page }) => {
      const newGrnLink = page.getByRole('link', { name: /New GRN/i })
      await expect(newGrnLink).toBeVisible()
      await newGrnLink.click()
      await page.waitForURL('**/inventory/grn/new', { timeout: 10_000 })
      expect(page.url()).toContain('/inventory/grn/new')
    })
  })

  test.describe('GRN Create', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/inventory/grn/new')
      await page.waitForLoadState('networkidle')
    })

    test('shows page header for new goods receipt', async ({ page }) => {
      await expect(page.getByText('New Goods Receipt')).toBeVisible()
    })

    test('has PO selection dropdown', async ({ page }) => {
      await expect(page.getByText('Select Purchase Order')).toBeVisible()
      // Either the combobox trigger (if eligible POs exist) or a message about no POs
      const selectTrigger = page.getByRole('combobox')
      const noPOsMessage = page.getByText('No approved purchase orders available')

      const hasTrigger = await selectTrigger.isVisible().catch(() => false)
      const hasNoPOs = await noPOsMessage.isVisible().catch(() => false)

      expect(hasTrigger || hasNoPOs).toBeTruthy()
    })

    test('has Back to List button', async ({ page }) => {
      const backLink = page.getByRole('link', { name: /Back to List/i })
      await expect(backLink).toBeVisible()
    })
  })

  test.describe('Stock Ledger', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/inventory/ledger')
      await page.waitForLoadState('networkidle')
    })

    test('shows page header with title and description', async ({ page }) => {
      await expect(page.getByText('Stock Ledger')).toBeVisible()
      await expect(
        page.getByText('Complete history of all inventory movements')
      ).toBeVisible()
    })

    test('has filter controls: Product Type, Movement Type, SKU, date range', async ({ page }) => {
      await expect(page.getByText('Product Type')).toBeVisible()
      await expect(page.getByText('Movement Type')).toBeVisible()
      await expect(page.getByLabel('SKU')).toBeVisible()
      await expect(page.getByLabel('Start Date')).toBeVisible()
      await expect(page.getByLabel('End Date')).toBeVisible()
    })

    test('has search input with correct placeholder', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search SKU, reference, notes...')
      await expect(searchInput).toBeVisible()
    })

    test('Export CSV button is present', async ({ page }) => {
      const exportBtn = page.getByRole('button', { name: /Export CSV/i })
      await expect(exportBtn).toBeVisible()
    })

    test('shows ledger entries table or empty state', async ({ page }) => {
      const table = page.locator('table')
      const emptyState = page.getByText('No ledger entries')
      const noMatches = page.getByText('No entries match your filters')

      const hasTable = await table.isVisible().catch(() => false)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)
      const hasNoMatches = await noMatches.isVisible().catch(() => false)

      expect(hasTable || hasEmptyState || hasNoMatches).toBeTruthy()
    })
  })

  test.describe('Inventory API', () => {
    test('GET /api/inventory/stock-overview returns data with summary and items', async ({ page }) => {
      await page.goto('/inventory')
      await page.waitForLoadState('networkidle')

      const result = await page.evaluate(async () => {
        const res = await fetch('/api/inventory/stock-overview')
        return { status: res.status, data: await res.json() }
      })

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('data')
      expect(result.data).toHaveProperty('summary')
      expect(Array.isArray(result.data.data)).toBeTruthy()
      expect(result.data.summary).toHaveProperty('totalSkus')
      expect(result.data.summary).toHaveProperty('lowStock')
      expect(result.data.summary).toHaveProperty('outOfStock')
      expect(result.data.summary).toHaveProperty('byProductType')
    })

    test('GET /api/inventory/stock-ledger returns paginated data', async ({ page }) => {
      await page.goto('/inventory')
      await page.waitForLoadState('networkidle')

      const result = await page.evaluate(async () => {
        const res = await fetch('/api/inventory/stock-ledger')
        return { status: res.status, data: await res.json() }
      })

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('data')
      expect(result.data).toHaveProperty('pagination')
      expect(Array.isArray(result.data.data)).toBeTruthy()
      expect(result.data.pagination).toHaveProperty('total')
      expect(result.data.pagination).toHaveProperty('totalPages')
    })
  })
})
