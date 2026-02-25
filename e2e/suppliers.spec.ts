import { test, expect } from '@playwright/test'

test.describe('Supplier Management', () => {
  test.describe('Supplier List', () => {
    test('supplier list page loads with table containing Code and Name columns', async ({ page }) => {
      await page.goto('/suppliers')
      await page.waitForLoadState('networkidle')

      // Page header
      await expect(page.getByRole('heading', { name: 'Suppliers' })).toBeVisible()

      // Table should be present
      const table = page.locator('table')
      await expect(table).toBeVisible()

      // Verify column headers: Code, Name, Contact, Email, GST Number, Products, Status, Actions
      const headers = table.locator('thead th')
      await expect(headers.nth(0)).toHaveText('Code')
      await expect(headers.nth(1)).toHaveText('Name')
      await expect(headers.nth(2)).toHaveText('Contact')
      await expect(headers.nth(3)).toHaveText('Email')
      await expect(headers.nth(4)).toHaveText('GST Number')
      await expect(headers.nth(5)).toHaveText('Products')
      await expect(headers.nth(6)).toHaveText('Status')
      await expect(headers.nth(7)).toHaveText('Actions')
    })

    test('supplier table has at least one data row', async ({ page }) => {
      await page.goto('/suppliers')
      await page.waitForLoadState('networkidle')

      const tableRows = page.locator('table tbody tr')
      const rowCount = await tableRows.count()
      expect(rowCount).toBeGreaterThanOrEqual(1)

      // First row should have a supplier code in font-mono format (e.g., SUP001)
      const firstRowCode = tableRows.first().locator('td').first()
      const codeText = await firstRowCode.textContent()
      expect(codeText?.trim()).toMatch(/^SUP\d+$/)
    })

    test('search input filters results', async ({ page }) => {
      await page.goto('/suppliers')
      await page.waitForLoadState('networkidle')

      // Find the search input by placeholder
      const searchInput = page.locator('input[placeholder="Search by name, code, or email..."]')
      await expect(searchInput).toBeVisible()

      // Type "SUP" into search
      await searchInput.fill('SUP')

      // Submit the search form by clicking the search button
      const searchButton = page.getByRole('button').filter({ has: page.locator('svg') }).first()
      await searchButton.click()
      await page.waitForLoadState('networkidle')

      // After search, table should still be visible (results matching "SUP")
      const table = page.locator('table')
      await expect(table).toBeVisible()

      // All visible supplier codes should contain "SUP"
      const codesCells = page.locator('table tbody tr td:first-child')
      const count = await codesCells.count()
      expect(count).toBeGreaterThanOrEqual(1)

      for (let i = 0; i < count; i++) {
        const text = await codesCells.nth(i).textContent()
        expect(text?.trim().toUpperCase()).toContain('SUP')
      }
    })

    test('pagination shows supplier count', async ({ page }) => {
      await page.goto('/suppliers')
      await page.waitForLoadState('networkidle')

      // "Showing X of Y suppliers" text should be present
      const paginationText = page.getByText(/Showing \d+ of \d+ suppliers/)
      await expect(paginationText).toBeVisible()
    })

    test('status filter dropdown is present with options', async ({ page }) => {
      await page.goto('/suppliers')
      await page.waitForLoadState('networkidle')

      // The status filter is a shadcn Select with placeholder "Filter by status"
      // It shows "All Suppliers" by default
      const selectTrigger = page.locator('button[role="combobox"]').filter({ hasText: /All Suppliers/ })
      await expect(selectTrigger).toBeVisible()
    })

    test('"Add Supplier" link navigates to /suppliers/new', async ({ page }) => {
      await page.goto('/suppliers')
      await page.waitForLoadState('networkidle')

      const addSupplierLink = page.getByRole('link', { name: /Add Supplier/i })
      await expect(addSupplierLink).toBeVisible()

      await addSupplierLink.click()
      await page.waitForURL('**/suppliers/new', { timeout: 10_000 })
      await expect(page).toHaveURL(/\/suppliers\/new$/)
    })
  })

  test.describe('Supplier Create Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/suppliers/new')
      await page.waitForLoadState('networkidle')
    })

    test('create form loads with page header', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Add Supplier' })).toBeVisible()
    })

    test('form has required name input field', async ({ page }) => {
      const nameInput = page.getByLabel('Supplier Name *')
      await expect(nameInput).toBeVisible()
      await expect(nameInput).toHaveAttribute('placeholder', 'Enter supplier name')
    })

    test('form has 14 supply category checkboxes', async ({ page }) => {
      // The form should have exactly 14 supply category checkboxes
      const checkboxes = page.locator('[role="checkbox"]')
      // There are 14 SUPPLY_CATEGORIES defined: finished, fabric, raw_material, packaging,
      // corporate_assets, samples, influencer_samples, transportation, advertisement,
      // office_expenses, software, feedback, misc, customer_refunds
      // Plus the "Active Status" Switch which is also a checkbox-like element.
      // Use the category-specific IDs to count precisely
      const categoryCheckboxes = page.locator('[id^="category-"]')
      const count = await categoryCheckboxes.count()
      expect(count).toBe(14)

      // Verify some specific categories are present
      await expect(page.getByLabel('Finished Goods')).toBeVisible()
      await expect(page.getByLabel('Fabric')).toBeVisible()
      await expect(page.getByLabel('Raw Material')).toBeVisible()
      await expect(page.getByLabel('Packaging')).toBeVisible()
      await expect(page.getByLabel('Transportation')).toBeVisible()
      await expect(page.getByLabel('Customer Refunds')).toBeVisible()
    })

    test('selecting categories shows count hint', async ({ page }) => {
      // Initially no "Selected:" text visible
      await expect(page.getByText(/Selected: \d+ categor/)).not.toBeVisible()

      // Click first category checkbox (Finished Goods)
      await page.getByLabel('Finished Goods').click()

      // Should show "Selected: 1 category"
      await expect(page.getByText('Selected: 1 category')).toBeVisible()

      // Click a second category
      await page.getByLabel('Fabric').click()

      // Should show "Selected: 2 categories"
      await expect(page.getByText('Selected: 2 categories')).toBeVisible()
    })

    test('Add Contact button adds a contact row', async ({ page }) => {
      const addContactButton = page.getByRole('button', { name: /Add Contact/i })
      await expect(addContactButton).toBeVisible()

      // Initially no contact rows
      await expect(page.getByText('Contact 1')).not.toBeVisible()

      // Click to add a contact
      await addContactButton.click()

      // Contact 1 header should appear
      await expect(page.getByText('Contact 1')).toBeVisible()

      // Contact row should have name, phone, and email input fields
      const contactSection = page.locator('.border.rounded-lg.p-4').first()
      const nameInput = contactSection.locator('input[placeholder="Name *"]')
      const phoneInput = contactSection.locator('input[placeholder="Phone"]')
      const emailInput = contactSection.locator('input[placeholder="Email"]')

      await expect(nameInput).toBeVisible()
      await expect(phoneInput).toBeVisible()
      await expect(emailInput).toBeVisible()
    })

    test('adding multiple contacts increments the contact number', async ({ page }) => {
      const addContactButton = page.getByRole('button', { name: /Add Contact/i })

      // Add first contact
      await addContactButton.click()
      await expect(page.getByText('Contact 1')).toBeVisible()

      // Add second contact
      await addContactButton.click()
      await expect(page.getByText('Contact 2')).toBeVisible()
    })

    test('first added contact is automatically set as primary', async ({ page }) => {
      const addContactButton = page.getByRole('button', { name: /Add Contact/i })
      await addContactButton.click()

      // The first contact's Primary switch should be checked
      const primarySwitch = page.locator('#primary-0')
      await expect(primarySwitch).toBeChecked()
    })

    test('contact row has a remove button', async ({ page }) => {
      const addContactButton = page.getByRole('button', { name: /Add Contact/i })
      await addContactButton.click()

      // The contact row should have a destructive (red) remove button
      const contactSection = page.locator('.border.rounded-lg.p-4').first()
      const removeButton = contactSection.locator('button').filter({ has: page.locator('svg') }).last()
      await expect(removeButton).toBeVisible()

      // Click remove button
      await removeButton.click()

      // Contact 1 should no longer be visible
      await expect(page.getByText('Contact 1')).not.toBeVisible()
    })

    test('form has tax information section with GST and PAN fields', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Tax Information' })).toBeVisible()
      await expect(page.getByLabel('GST Number')).toBeVisible()
      await expect(page.getByLabel('PAN Number')).toBeVisible()
    })

    test('form has banking details section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Banking Details' })).toBeVisible()
      await expect(page.getByLabel('Bank Name')).toBeVisible()
      await expect(page.getByLabel('IFSC Code')).toBeVisible()
      await expect(page.getByLabel('Account Number')).toBeVisible()
      await expect(page.getByLabel('Payment Terms')).toBeVisible()
    })

    test('Create Supplier button is disabled when form is incomplete', async ({ page }) => {
      // Without filling name or selecting categories, submit button should be disabled
      const submitButton = page.getByRole('button', { name: 'Create Supplier' })
      await expect(submitButton).toBeVisible()
      await expect(submitButton).toBeDisabled()
    })

    test('name field shows validation error on blur when empty', async ({ page }) => {
      const nameInput = page.getByLabel('Supplier Name *')

      // Focus and then blur the name field without typing
      await nameInput.focus()
      await nameInput.blur()

      // Validation error should appear
      await expect(page.getByText('Supplier name is required')).toBeVisible()
    })

    test('name field clears validation error when valid input is provided', async ({ page }) => {
      const nameInput = page.getByLabel('Supplier Name *')

      // Trigger error
      await nameInput.focus()
      await nameInput.blur()
      await expect(page.getByText('Supplier name is required')).toBeVisible()

      // Type a valid name
      await nameInput.fill('Test Supplier Name')
      await expect(page.getByText('Supplier name is required')).not.toBeVisible()
    })
  })

  test.describe('VendorSelector', () => {
    test('vendor selector on PO create page shows Supplier label and dropdown', async ({ page }) => {
      await page.goto('/purchase-orders/new')
      await page.waitForLoadState('networkidle')

      // The POForm has a Supplier label and Select dropdown
      await expect(page.getByLabel('Supplier')).toBeVisible()

      // The Select trigger should have "Select supplier" placeholder
      const supplierSelect = page.locator('button[role="combobox"]').filter({ hasText: /Select supplier/ })
      await expect(supplierSelect).toBeVisible()
    })
  })
})
