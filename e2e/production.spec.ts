import { test, expect } from '@playwright/test'

test.describe('Production Module', () => {
  test.describe('Production Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/production')
      await page.waitForLoadState('networkidle')
    })

    test('shows page header with title and description', async ({ page }) => {
      await expect(page.getByText('Production').first()).toBeVisible()
      await expect(
        page.getByText('Manage in-house production and job work orders')
      ).toBeVisible()
    })

    test('shows summary cards: In-House Orders and Job Work POs', async ({ page }) => {
      await expect(page.getByText('In-House Orders')).toBeVisible()
      await expect(page.getByText('Job Work POs')).toBeVisible()
      await expect(page.getByText('Completed')).toBeVisible()
      await expect(page.getByText('At Vendor')).toBeVisible()
    })

    test('has In-House Production and Job Work Orders tabs', async ({ page }) => {
      const inHouseTab = page.getByRole('tab', { name: /In-House Production/i })
      const jobWorkTab = page.getByRole('tab', { name: /Job Work Orders/i })

      await expect(inHouseTab).toBeVisible()
      await expect(jobWorkTab).toBeVisible()
    })

    test('In-House tab shows production table or empty message', async ({ page }) => {
      const inHouseTab = page.getByRole('tab', { name: /In-House Production/i })
      await inHouseTab.click()

      const table = page.locator('table').first()
      const emptyMsg = page.getByText('No in-house production orders yet.')

      const hasTable = await table.isVisible().catch(() => false)
      const hasEmpty = await emptyMsg.isVisible().catch(() => false)

      expect(hasTable || hasEmpty).toBeTruthy()
    })

    test('In-House tab has New Production Order button', async ({ page }) => {
      const inHouseTab = page.getByRole('tab', { name: /In-House Production/i })
      await inHouseTab.click()

      const newOrderLink = page.getByRole('link', { name: /New Production Order/i })
      await expect(newOrderLink).toBeVisible()
    })

    test('Job Work tab shows PO table or empty message', async ({ page }) => {
      const jobWorkTab = page.getByRole('tab', { name: /Job Work Orders/i })
      await jobWorkTab.click()

      const table = page.locator('table').first()
      const emptyMsg = page.getByText('No job work orders.')

      const hasTable = await table.isVisible().catch(() => false)
      const hasEmpty = await emptyMsg.isVisible().catch(() => false)

      expect(hasTable || hasEmpty).toBeTruthy()
    })

    test('Job Work tab has Issue Materials button', async ({ page }) => {
      const jobWorkTab = page.getByRole('tab', { name: /Job Work Orders/i })
      await jobWorkTab.click()

      const issueMaterialsLink = page.getByRole('link', { name: /Issue Materials/i })
      await expect(issueMaterialsLink).toBeVisible()
    })
  })

  test.describe('In-House Production List', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/production/in-house')
      await page.waitForLoadState('networkidle')
    })

    test('shows page header with title', async ({ page }) => {
      await expect(page.getByText('In-House Production')).toBeVisible()
    })

    test('shows production table or empty state with Start Production button', async ({ page }) => {
      const table = page.locator('table')
      const emptyState = page.getByText('No production records')

      const hasTable = await table.isVisible().catch(() => false)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      expect(hasTable || hasEmptyState).toBeTruthy()

      if (hasEmptyState) {
        const startBtn = page.getByRole('link', { name: /Start Production/i })
        await expect(startBtn).toBeVisible()
      }
    })

    test('has New Production button in header', async ({ page }) => {
      const newBtn = page.getByRole('link', { name: /New Production/i })
      await expect(newBtn).toBeVisible()
    })

    test('has search input', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search by number, product, SKU...')
      await expect(searchInput).toBeVisible()
    })
  })

  test.describe('Create Production Order', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/production/in-house/new')
      await page.waitForLoadState('networkidle')
    })

    test('shows page header for new production run', async ({ page }) => {
      await expect(page.getByText('New Production Run')).toBeVisible()
      await expect(
        page.getByText('Create a new in-house production order')
      ).toBeVisible()
    })

    test('has required form fields: SKU, Product Name, Planned Qty, Target Date', async ({ page }) => {
      await expect(page.getByLabel('Product SKU *')).toBeVisible()
      await expect(page.getByLabel('Product Name *')).toBeVisible()
      await expect(page.getByLabel('Planned Quantity *')).toBeVisible()
      await expect(page.getByLabel('Target Date *')).toBeVisible()
    })

    test('has optional form fields: Production Line, Location, Notes', async ({ page }) => {
      await expect(page.getByLabel('Production Line')).toBeVisible()
      await expect(page.getByLabel('Location')).toBeVisible()
      await expect(page.getByLabel('Notes')).toBeVisible()
    })

    test('has Cancel and Create Production Order buttons', async ({ page }) => {
      const cancelBtn = page.getByRole('button', { name: /Cancel/i })
      const createBtn = page.getByRole('button', { name: /Create Production Order/i })

      await expect(cancelBtn).toBeVisible()
      await expect(createBtn).toBeVisible()
    })

    test('has Back to List link', async ({ page }) => {
      const backLink = page.getByRole('link', { name: /Back to List/i })
      await expect(backLink).toBeVisible()
    })
  })

  test.describe('Job Work', () => {
    test('Job Work list page shows eligible POs or empty state', async ({ page }) => {
      await page.goto('/production/job-work')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('Job Work')).toBeVisible()

      const table = page.locator('table')
      const emptyState = page.getByText('No job work orders')

      const hasTable = await table.isVisible().catch(() => false)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      expect(hasTable || hasEmptyState).toBeTruthy()
    })

    test('Job Work list has Issue Materials button', async ({ page }) => {
      await page.goto('/production/job-work')
      await page.waitForLoadState('networkidle')

      const issueLink = page.getByRole('link', { name: /Issue Materials/i })
      await expect(issueLink).toBeVisible()
    })

    test('Issue RM page loads', async ({ page }) => {
      await page.goto('/production/job-work/issue')
      await page.waitForLoadState('networkidle')

      const content = page.locator('main, [role="main"]').first()
      await expect(content).toBeVisible()
    })
  })

  test.describe('Production API', () => {
    test('GET /api/production/orders returns paginated list', async ({ page }) => {
      await page.goto('/production')
      await page.waitForLoadState('networkidle')

      const result = await page.evaluate(async () => {
        const res = await fetch('/api/production/orders')
        return { status: res.status, data: await res.json() }
      })

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('data')
      expect(result.data).toHaveProperty('total')
      expect(Array.isArray(result.data.data)).toBeTruthy()
      expect(typeof result.data.total).toBe('number')
    })

    test('GET /api/production/available-batches returns batches array', async ({ page }) => {
      await page.goto('/production')
      await page.waitForLoadState('networkidle')

      const result = await page.evaluate(async () => {
        const res = await fetch('/api/production/available-batches')
        return { status: res.status, data: await res.json() }
      })

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('data')
      expect(Array.isArray(result.data.data)).toBeTruthy()
    })
  })
})
