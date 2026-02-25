import { test, expect } from '@playwright/test'

test.describe('Admin Settings', () => {
  test.describe('Settings Hub', () => {
    test('settings hub page loads with navigation cards', async ({ page }) => {
      await page.goto('/admin/settings')
      await page.waitForLoadState('networkidle')

      // Page header
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Navigation cards: Purchase Types, Sales Channels, Entities, Company Information
      await expect(page.getByRole('heading', { name: 'Purchase Types' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Sales Channels' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Entities' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Company Information' })).toBeVisible()
    })

    test('settings cards link to correct pages', async ({ page }) => {
      await page.goto('/admin/settings')
      await page.waitForLoadState('networkidle')

      // Sales Channels card links to /admin/settings/sales-channels
      const salesChannelLink = page.locator('a[href="/admin/settings/sales-channels"]')
      await expect(salesChannelLink).toBeVisible()

      // Entities card links to /admin/settings/entities
      const entitiesLink = page.locator('a[href="/admin/settings/entities"]')
      await expect(entitiesLink).toBeVisible()

      // Company card links to /admin/settings/company
      const companyLink = page.locator('a[href="/admin/settings/company"]')
      await expect(companyLink).toBeVisible()
    })
  })

  test.describe('Sales Channels', () => {
    test('sales channels page loads with header and table', async ({ page }) => {
      await page.goto('/admin/settings/sales-channels')
      await page.waitForLoadState('networkidle')

      // Page header with title
      await expect(page.getByRole('heading', { name: 'Sales Channels' }).first()).toBeVisible()

      // Table should be present with correct column headers
      const table = page.locator('table')
      await expect(table).toBeVisible()

      const headers = table.locator('thead th')
      await expect(headers.nth(0)).toHaveText('Name')
      await expect(headers.nth(1)).toHaveText('Code')
      await expect(headers.nth(2)).toHaveText('Status')
      await expect(headers.nth(3)).toHaveText('Actions')
    })

    test('channels table displays data rows with correct structure', async ({ page }) => {
      await page.goto('/admin/settings/sales-channels')
      await page.waitForLoadState('networkidle')

      const tableBody = page.locator('table tbody')
      const rows = tableBody.locator('tr')
      const rowCount = await rows.count()

      // Should have at least one row (either data or the "no channels" message)
      expect(rowCount).toBeGreaterThanOrEqual(1)

      // If there are data rows, each should have Name, Code, Status badge, and action buttons
      const firstRowCells = rows.first().locator('td')
      const cellCount = await firstRowCells.count()

      if (cellCount === 4) {
        // Data row: check that status badge exists (Active or Inactive)
        const statusCell = firstRowCells.nth(2)
        const badge = statusCell.locator('[class*="badge"], [data-slot="badge"]')
        await expect(badge).toBeVisible()
        const badgeText = await badge.textContent()
        expect(['Active', 'Inactive']).toContain(badgeText?.trim())
      }
    })

    test('Add Channel button is present and opens dialog', async ({ page }) => {
      await page.goto('/admin/settings/sales-channels')
      await page.waitForLoadState('networkidle')

      const addButton = page.getByRole('button', { name: /Add Channel/i })
      await expect(addButton).toBeVisible()

      // Click to open the add dialog
      await addButton.click()

      // Dialog should open with title "Add Sales Channel"
      await expect(page.getByRole('heading', { name: 'Add Sales Channel' })).toBeVisible()

      // Dialog should have Name and Code fields
      await expect(page.getByLabel('Channel Name')).toBeVisible()
      await expect(page.getByLabel('Code')).toBeVisible()

      // Dialog should have Cancel and Create Channel buttons
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Create Channel' })).toBeVisible()
    })

    test('sales channels API returns valid data', async ({ page }) => {
      await page.goto('/admin/settings/sales-channels')
      await page.waitForLoadState('networkidle')

      const result = await page.evaluate(async () => {
        const res = await fetch('/api/admin/settings/sales-channels')
        return { status: res.status, data: await res.json() }
      })

      expect(result.status).toBe(200)
      expect(Array.isArray(result.data)).toBe(true)

      // Each channel should have id, name, code, isActive
      if (result.data.length > 0) {
        const channel = result.data[0]
        expect(channel).toHaveProperty('id')
        expect(channel).toHaveProperty('name')
        expect(channel).toHaveProperty('code')
        expect(channel).toHaveProperty('isActive')
      }
    })
  })

  test.describe('Entities', () => {
    test('entities page loads with header and entity list', async ({ page }) => {
      await page.goto('/admin/settings/entities')
      await page.waitForLoadState('networkidle')

      // Page header
      await expect(page.getByRole('heading', { name: 'Entities' }).first()).toBeVisible()

      // Subheader in the EntitiesTab component
      await expect(page.getByText('Entities & Payment Modes')).toBeVisible()
    })

    test('entity list renders accordion items with name, type badge, and status', async ({ page }) => {
      await page.goto('/admin/settings/entities')
      await page.waitForLoadState('networkidle')

      // Fetch entities to know how many to expect
      const result = await page.evaluate(async () => {
        const res = await fetch('/api/admin/settings/entities')
        return { status: res.status, data: await res.json() }
      })

      expect(result.status).toBe(200)

      if (result.data.length > 0) {
        const firstEntity = result.data[0]

        // Entity name should be visible as a semibold span inside the accordion header
        await expect(page.getByText(firstEntity.name).first()).toBeVisible()

        // Each entity should show a type badge (In-House or External)
        const typeBadge = page.locator('[class*="badge"], [data-slot="badge"]').filter({ hasText: /In-House|External/ }).first()
        await expect(typeBadge).toBeVisible()

        // Each entity should show a status badge (Active or Inactive)
        const statusBadge = page.locator('[class*="badge"], [data-slot="badge"]').filter({ hasText: /^Active$|^Inactive$/ }).first()
        await expect(statusBadge).toBeVisible()

        // Each entity should show payment mode count
        await expect(page.getByText(/\d+ payment mode/).first()).toBeVisible()
      }
    })

    test('expanding an entity reveals payment modes section', async ({ page }) => {
      await page.goto('/admin/settings/entities')
      await page.waitForLoadState('networkidle')

      // Get the first entity accordion header and click it
      const entityHeaders = page.locator('.cursor-pointer.hover\\:bg-muted\\/50')
      const headerCount = await entityHeaders.count()

      if (headerCount > 0) {
        await entityHeaders.first().click()

        // After expanding, should see "Payment Modes" heading
        await expect(page.getByText('Payment Modes').first()).toBeVisible()

        // Should see "Add Payment Mode" button inside the expanded section
        await expect(page.getByRole('button', { name: /Add Payment Mode/i }).first()).toBeVisible()
      }
    })

    test('Add Entity button is present and opens dialog', async ({ page }) => {
      await page.goto('/admin/settings/entities')
      await page.waitForLoadState('networkidle')

      const addButton = page.getByRole('button', { name: /Add Entity/i })
      await expect(addButton).toBeVisible()

      await addButton.click()

      // Dialog should open with "Add Entity" title
      await expect(page.getByRole('heading', { name: 'Add Entity' })).toBeVisible()

      // Dialog should have Entity Name input and Type select
      await expect(page.getByLabel('Entity Name')).toBeVisible()
      await expect(page.getByLabel('Type')).toBeVisible()

      // Dialog should have Cancel and Create Entity buttons
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Create Entity' })).toBeVisible()
    })

    test('entities API returns array with payment modes', async ({ page }) => {
      await page.goto('/admin/settings/entities')
      await page.waitForLoadState('networkidle')

      const result = await page.evaluate(async () => {
        const res = await fetch('/api/admin/settings/entities')
        return { status: res.status, data: await res.json() }
      })

      expect(result.status).toBe(200)
      expect(Array.isArray(result.data)).toBe(true)

      if (result.data.length > 0) {
        const entity = result.data[0]
        expect(entity).toHaveProperty('id')
        expect(entity).toHaveProperty('name')
        expect(entity).toHaveProperty('type')
        expect(entity).toHaveProperty('isActive')
        expect(entity).toHaveProperty('paymentModes')
        expect(Array.isArray(entity.paymentModes)).toBe(true)
      }
    })
  })

  test.describe('Company Information', () => {
    test('company info page loads with form fields', async ({ page }) => {
      await page.goto('/admin/settings/company')
      await page.waitForLoadState('networkidle')

      // Page header
      await expect(page.getByRole('heading', { name: 'Company Information' }).first()).toBeVisible()

      // Card with "Company Details" heading
      await expect(page.getByRole('heading', { name: 'Company Details' })).toBeVisible()

      // Form fields
      await expect(page.getByLabel('Company Name')).toBeVisible()
      await expect(page.getByLabel('GST Number')).toBeVisible()
      await expect(page.getByLabel('Registered Address')).toBeVisible()
      await expect(page.getByLabel('Contact Email')).toBeVisible()
      await expect(page.getByLabel('Contact Phone')).toBeVisible()
    })

    test('company name field has default value "Thevasa"', async ({ page }) => {
      await page.goto('/admin/settings/company')
      await page.waitForLoadState('networkidle')

      const companyNameInput = page.getByLabel('Company Name')
      await expect(companyNameInput).toHaveValue('Thevasa')
    })

    test('GST number field shows character counter', async ({ page }) => {
      await page.goto('/admin/settings/company')
      await page.waitForLoadState('networkidle')

      // GST field starts empty, so counter should show "0/15 characters"
      await expect(page.getByText('0/15 characters')).toBeVisible()

      // Type some characters and verify counter updates
      const gstInput = page.getByLabel('GST Number')
      await gstInput.fill('22AAAAA')
      await expect(page.getByText('7/15 characters')).toBeVisible()
    })

    test('Save button is present', async ({ page }) => {
      await page.goto('/admin/settings/company')
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('button', { name: 'Save Company Information' })).toBeVisible()
    })
  })

  test.describe('Approvals Hub', () => {
    test('approvals hub page loads with PO and Payment approval cards', async ({ page }) => {
      await page.goto('/admin/approvals')
      await page.waitForLoadState('networkidle')

      // Page header
      await expect(page.getByRole('heading', { name: 'Approvals' })).toBeVisible()

      // PO Approvals card
      await expect(page.getByRole('heading', { name: 'PO Approvals' })).toBeVisible()
      await expect(page.getByText('Review purchase order requests')).toBeVisible()

      // Payment Approvals card
      await expect(page.getByRole('heading', { name: 'Payment Approvals' })).toBeVisible()
      await expect(page.getByText('Review payment requests')).toBeVisible()
    })

    test('approval cards show dynamic pending counts (B12 regression)', async ({ page }) => {
      await page.goto('/admin/approvals')
      await page.waitForLoadState('networkidle')

      // Wait for counts to load (they start as "..." then become numbers)
      // The counts are rendered as <p className="text-2xl font-bold">{pendingPOs ?? '...'}</p>
      const countElements = page.locator('p.text-2xl.font-bold')
      await expect(countElements).toHaveCount(2)

      // Wait for the loading state to resolve (counts should not stay as "...")
      await expect(countElements.first()).not.toHaveText('...', { timeout: 10_000 })
      await expect(countElements.nth(1)).not.toHaveText('...', { timeout: 10_000 })

      // Both counts should be numeric strings (the actual number from the API, not hardcoded)
      const poCountText = await countElements.first().textContent()
      const paymentCountText = await countElements.nth(1).textContent()

      expect(poCountText).toMatch(/^\d+$/)
      expect(paymentCountText).toMatch(/^\d+$/)
    })

    test('approval cards link to their detail pages', async ({ page }) => {
      await page.goto('/admin/approvals')
      await page.waitForLoadState('networkidle')

      // PO Approvals links to /admin/approvals/po
      const poLink = page.locator('a[href="/admin/approvals/po"]')
      await expect(poLink).toBeVisible()

      // Payment Approvals links to /admin/approvals/payments
      const paymentLink = page.locator('a[href="/admin/approvals/payments"]')
      await expect(paymentLink).toBeVisible()
    })

    test('approval counts match API data', async ({ page }) => {
      await page.goto('/admin/approvals')
      await page.waitForLoadState('networkidle')

      // Fetch the same APIs that the page fetches
      const [poResult, paymentResult] = await page.evaluate(async () => {
        const [poRes, payRes] = await Promise.all([
          fetch('/api/admin/approvals/po'),
          fetch('/api/finance/payments?status=pending_approval'),
        ])
        const poData = poRes.ok ? await poRes.json() : null
        const payData = payRes.ok ? await payRes.json() : null
        return [poData, payData]
      })

      // Wait for the UI counts to load
      const countElements = page.locator('p.text-2xl.font-bold')
      await expect(countElements.first()).not.toHaveText('...', { timeout: 10_000 })

      const poCountText = await countElements.first().textContent()
      const paymentCountText = await countElements.nth(1).textContent()

      // Verify PO count matches API
      const expectedPOCount = Array.isArray(poResult)
        ? poResult.length
        : (poResult?.total ?? 0)
      expect(Number(poCountText)).toBe(expectedPOCount)

      // Verify Payment count matches API
      const expectedPaymentCount = Array.isArray(paymentResult)
        ? paymentResult.length
        : (paymentResult?.total ?? 0)
      expect(Number(paymentCountText)).toBe(expectedPaymentCount)
    })

    test('each approval card shows "Pending approval" label', async ({ page }) => {
      await page.goto('/admin/approvals')
      await page.waitForLoadState('networkidle')

      const pendingLabels = page.getByText('Pending approval')
      await expect(pendingLabels).toHaveCount(2)
    })
  })
})

test.describe('User Management', () => {
  test('user list page loads with content', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    const content = page.locator('main, [role="main"]').first()
    await expect(content).toBeVisible()
  })

  test('Add User link is visible for Super Admin', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    const addUserLink = page.getByRole('link', { name: /add user/i })
    await expect(addUserLink).toBeVisible()
  })
})

test.describe('External Vendors', () => {
  test('vendors hub page shows Shivaang', async ({ page }) => {
    await page.goto('/external-vendors')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/shivaang/i).first()).toBeVisible()
  })

  test('Shivaang dashboard loads with tabs', async ({ page }) => {
    await page.goto('/external-vendors/shivaang')
    await page.waitForLoadState('networkidle')

    const tabs = page.getByRole('tab')
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThanOrEqual(2)
  })

  test('Shivaang API returns overview and transactions', async ({ page }) => {
    await page.goto('/external-vendors/shivaang')
    await page.waitForLoadState('networkidle')

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/external-vendors/shivaang')
      return { status: res.status, data: await res.json() }
    })

    expect(result.status).toBe(200)
    expect(result.data).toHaveProperty('overview')
    expect(result.data).toHaveProperty('transactions')
  })
})
