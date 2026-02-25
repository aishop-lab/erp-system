import { test, expect } from '@playwright/test'
import { navigateTo, apiGet, apiPost } from './helpers'

test.describe('Purchase Orders', () => {
  test.describe('PO List Page', () => {
    test.beforeEach(async ({ page }) => {
      await navigateTo(page, '/purchase-orders')
    })

    test('shows page title and New Order button', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible()
      const newOrderLink = page.getByRole('link', { name: /New Order/i })
      await expect(newOrderLink).toBeVisible()
      await expect(newOrderLink).toHaveAttribute('href', '/purchase-orders/new')
    })

    test('shows table with correct column headers', async ({ page }) => {
      const table = page.locator('table')
      await expect(table).toBeVisible()

      const expectedHeaders = ['PO Number', 'Type', 'Supplier', 'Entity', 'Status', 'Amount', 'Date']
      for (const header of expectedHeaders) {
        await expect(table.locator('thead th', { hasText: header })).toBeVisible()
      }
    })

    test('has search input that accepts text', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search by PO number..."]')
      await expect(searchInput).toBeVisible()

      await searchInput.fill('FIN')
      await expect(searchInput).toHaveValue('FIN')

      // Wait for API debounce and verify the search value persists
      await page.waitForTimeout(500)
      await expect(searchInput).toHaveValue('FIN')
    })

    test('has status filter dropdown', async ({ page }) => {
      const statusTrigger = page.locator('button[role="combobox"]').filter({ hasText: /Filter by status|All Statuses/i })
      await expect(statusTrigger).toBeVisible()

      // Open the dropdown
      await statusTrigger.click()

      // Verify options are visible
      await expect(page.getByRole('option', { name: 'All Statuses' })).toBeVisible()
    })

    test('has type filter dropdown', async ({ page }) => {
      const typeTrigger = page.locator('button[role="combobox"]').filter({ hasText: /Filter by type|All Types/i })
      await expect(typeTrigger).toBeVisible()

      // Open the dropdown
      await typeTrigger.click()

      // Verify some type options are visible
      await expect(page.getByRole('option', { name: 'All Types' })).toBeVisible()
      await expect(page.getByRole('option', { name: 'Transportation' })).toBeVisible()
    })

    test('New Order link navigates to /purchase-orders/new', async ({ page }) => {
      const newOrderLink = page.getByRole('link', { name: /New Order/i })
      await newOrderLink.click()
      await page.waitForURL('**/purchase-orders/new', { timeout: 10_000 })
      await expect(page).toHaveURL(/\/purchase-orders\/new/)
    })
  })

  test.describe('PO Create Page', () => {
    test.beforeEach(async ({ page }) => {
      await navigateTo(page, '/purchase-orders/new')
    })

    test('shows page title "New Purchase Order"', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'New Purchase Order' })).toBeVisible()
    })

    test('has purchase type selector with label', async ({ page }) => {
      await expect(page.getByText('Purchase Type *')).toBeVisible()
      // The select trigger should be present
      const typeTrigger = page.locator('button[role="combobox"]').first()
      await expect(typeTrigger).toBeVisible()
    })

    test('has supplier dropdown', async ({ page }) => {
      await expect(page.getByText('Supplier', { exact: false })).toBeVisible()
    })

    test('has notes textarea', async ({ page }) => {
      const notesTextarea = page.locator('#notes')
      await expect(notesTextarea).toBeVisible()
      await expect(notesTextarea).toHaveAttribute('placeholder', 'Additional notes...')
    })

    test('has Save as Draft button', async ({ page }) => {
      const draftBtn = page.getByRole('button', { name: 'Save as Draft' })
      await expect(draftBtn).toBeVisible()
    })

    test('has Save & Submit button', async ({ page }) => {
      const submitBtn = page.getByRole('button', { name: 'Save & Submit' })
      await expect(submitBtn).toBeVisible()
    })

    test('selecting Transportation type shows free-text line items card', async ({ page }) => {
      // The default type is Finished; we need to change to Transportation
      // Click the purchase type selector
      const typeSelect = page.locator('button[role="combobox"]').first()
      await typeSelect.click()

      // Select Transportation
      await page.getByRole('option', { name: 'Transportation' }).click()

      // Now the Line Items card should show free-text mode with "Add Item" button
      await expect(page.getByRole('button', { name: /Add Item/i })).toBeVisible()

      // Should show the empty message
      await expect(page.getByText('Click "Add Item" to add line items')).toBeVisible()
    })

    test('adding a free-text line item shows inline editing fields', async ({ page }) => {
      // Switch to Transportation (free-text mode)
      const typeSelect = page.locator('button[role="combobox"]').first()
      await typeSelect.click()
      await page.getByRole('option', { name: 'Transportation' }).click()

      // Click Add Item
      await page.getByRole('button', { name: /Add Item/i }).click()

      // Verify line item table headers appear
      const lineItemTable = page.locator('table').last()
      await expect(lineItemTable.locator('thead th', { hasText: 'Description' })).toBeVisible()
      await expect(lineItemTable.locator('thead th', { hasText: 'Qty' })).toBeVisible()
      await expect(lineItemTable.locator('thead th', { hasText: 'Unit Price' })).toBeVisible()
      await expect(lineItemTable.locator('thead th', { hasText: 'GST %' })).toBeVisible()

      // Verify the description input is in the row
      const descriptionInput = lineItemTable.locator('input[placeholder="Enter description"]')
      await expect(descriptionInput).toBeVisible()
    })
  })

  test.describe('PO API Tests (via browser fetch)', () => {
    test('GET /api/purchase-orders returns paginated response', async ({ page }) => {
      await navigateTo(page, '/purchase-orders')
      const result = await apiGet(page, '/api/purchase-orders')

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('data')
      expect(result.data).toHaveProperty('total')
      expect(result.data).toHaveProperty('page')
      expect(result.data).toHaveProperty('pageSize')
      expect(result.data).toHaveProperty('totalPages')
      expect(Array.isArray(result.data.data)).toBe(true)
      expect(typeof result.data.total).toBe('number')
      expect(typeof result.data.page).toBe('number')
      expect(typeof result.data.pageSize).toBe('number')
      expect(typeof result.data.totalPages).toBe('number')
    })

    test('GET /api/purchase-orders with search param returns filtered results', async ({ page }) => {
      await navigateTo(page, '/purchase-orders')
      const result = await apiGet(page, '/api/purchase-orders?search=NONEXISTENT999')

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('data')
      expect(Array.isArray(result.data.data)).toBe(true)
      // Searching for a nonexistent PO should return 0 results
      expect(result.data.data.length).toBe(0)
    })

    test('POST /api/purchase-orders creates a free-text draft PO', async ({ page }) => {
      await navigateTo(page, '/purchase-orders')

      const result = await apiPost(page, '/api/purchase-orders', {
        purchaseType: 'transportation',
        entryMode: 'free_text',
        supplierId: null,
        notes: 'E2E test transportation PO',
        expectedDelivery: null,
        freeTextItems: [
          {
            description: 'Local delivery service',
            quantity: 1,
            unitPrice: 500,
            taxRate: 18,
          },
        ],
      })

      expect(result.status).toBe(201)
      expect(result.data).toHaveProperty('id')
      expect(result.data).toHaveProperty('poNumber')
      expect(result.data.purchaseType).toBe('transportation')
      expect(result.data.status).toBe('draft')
      expect(result.data.poNumber).toMatch(/^PO-/)

      // Clean up: delete the draft PO
      const poId = result.data.id
      await page.evaluate(async (deleteId) => {
        await fetch(`/api/purchase-orders/${deleteId}`, { method: 'DELETE' })
      }, poId)
    })
  })
})
