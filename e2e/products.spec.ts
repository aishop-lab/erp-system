import { test, expect } from '@playwright/test'
import { navigateTo, apiGet } from './helpers'

test.describe('Product Information', () => {
  test.describe('Products Hub', () => {
    test('shows 5 library cards with correct titles', async ({ page }) => {
      await navigateTo(page, '/products')

      const expectedCards = [
        'Finished Products',
        'Style Library',
        'Fabric Library',
        'Raw Materials',
        'Packaging',
      ]

      for (const title of expectedCards) {
        await expect(page.getByRole('heading', { name: title })).toBeVisible()
      }
    })

    test('each card links to the correct library page', async ({ page }) => {
      await navigateTo(page, '/products')

      const cardLinks: Record<string, string> = {
        'Finished Products': '/products/finished',
        'Style Library': '/products/styles',
        'Fabric Library': '/products/fabrics',
        'Raw Materials': '/products/raw-materials',
        'Packaging': '/products/packaging',
      }

      for (const [title, href] of Object.entries(cardLinks)) {
        const link = page.locator(`a[href="${href}"]`)
        await expect(link).toBeVisible()
        // Verify the card text is inside the link
        await expect(link.getByText(title)).toBeVisible()
      }
    })
  })

  test.describe('Style Library', () => {
    test.beforeEach(async ({ page }) => {
      await navigateTo(page, '/products/styles')
    })

    test('shows table with correct column headers', async ({ page }) => {
      const table = page.locator('table')
      await expect(table).toBeVisible()

      const expectedHeaders = ['Style Code', 'Style Name', 'Gender', 'Category', 'Status', 'Actions']
      for (const header of expectedHeaders) {
        await expect(table.locator('thead th', { hasText: header })).toBeVisible()
      }
    })

    test('has search input for styles', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search styles..."]')
      await expect(searchInput).toBeVisible()
    })

    test('has Create Style button linking to new page', async ({ page }) => {
      const createBtn = page.getByRole('link', { name: /Create Style/i })
      await expect(createBtn).toBeVisible()
      await expect(createBtn).toHaveAttribute('href', '/products/styles/new')
    })
  })

  test.describe('Fabric Library', () => {
    test.beforeEach(async ({ page }) => {
      await navigateTo(page, '/products/fabrics')
    })

    test('shows table with SKU, Material, Color columns', async ({ page }) => {
      const table = page.locator('table')
      await expect(table).toBeVisible()

      const expectedHeaders = ['SKU', 'Material', 'Color', 'Supplier', 'Cost', 'Status', 'Actions']
      for (const header of expectedHeaders) {
        await expect(table.locator('thead th', { hasText: header })).toBeVisible()
      }
    })

    test('has search input for fabrics', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search fabrics..."]')
      await expect(searchInput).toBeVisible()
    })

    test('has Add Fabric button linking to new page', async ({ page }) => {
      const addBtn = page.getByRole('link', { name: /Add Fabric/i })
      await expect(addBtn).toBeVisible()
      await expect(addBtn).toHaveAttribute('href', '/products/fabrics/new')
    })
  })

  test.describe('Raw Materials Library', () => {
    test.beforeEach(async ({ page }) => {
      await navigateTo(page, '/products/raw-materials')
    })

    test('shows table with correct column headers', async ({ page }) => {
      const table = page.locator('table')
      await expect(table).toBeVisible()

      const expectedHeaders = ['SKU', 'Type', 'Color', 'Unit', 'Supplier', 'Cost', 'Status', 'Actions']
      for (const header of expectedHeaders) {
        await expect(table.locator('thead th', { hasText: header })).toBeVisible()
      }
    })

    test('has search input for raw materials', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search raw materials..."]')
      await expect(searchInput).toBeVisible()
    })

    test('has Add Raw Material button linking to new page', async ({ page }) => {
      const addBtn = page.getByRole('link', { name: /Add Raw Material/i })
      await expect(addBtn).toBeVisible()
      await expect(addBtn).toHaveAttribute('href', '/products/raw-materials/new')
    })
  })

  test.describe('Packaging Library', () => {
    test.beforeEach(async ({ page }) => {
      await navigateTo(page, '/products/packaging')
    })

    test('shows table with correct column headers', async ({ page }) => {
      const table = page.locator('table')
      await expect(table).toBeVisible()

      const expectedHeaders = ['SKU', 'Type', 'Channel', 'Dimensions', 'Unit', 'Supplier', 'Cost', 'Status', 'Actions']
      for (const header of expectedHeaders) {
        await expect(table.locator('thead th', { hasText: header })).toBeVisible()
      }
    })

    test('has search input for packaging', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search packaging..."]')
      await expect(searchInput).toBeVisible()
    })

    test('has Add Packaging button linking to new page', async ({ page }) => {
      const addBtn = page.getByRole('link', { name: /Add Packaging/i })
      await expect(addBtn).toBeVisible()
      await expect(addBtn).toHaveAttribute('href', '/products/packaging/new')
    })
  })

  test.describe('Finished Products Library', () => {
    test.beforeEach(async ({ page }) => {
      await navigateTo(page, '/products/finished')
    })

    test('shows table with correct column headers', async ({ page }) => {
      const table = page.locator('table')
      await expect(table).toBeVisible()

      const expectedHeaders = ['Parent SKU', 'Child SKU', 'Title', 'Color/Size', 'Style', 'Fabric', 'Cost', 'MRP', 'Status', 'Actions']
      for (const header of expectedHeaders) {
        await expect(table.locator('thead th', { hasText: header })).toBeVisible()
      }
    })

    test('has search input for finished products', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search by SKU or title..."]')
      await expect(searchInput).toBeVisible()
    })

    test('has Add Product button linking to new page', async ({ page }) => {
      const addBtn = page.getByRole('link', { name: /Add Product/i })
      await expect(addBtn).toBeVisible()
      await expect(addBtn).toHaveAttribute('href', '/products/finished/new')
    })
  })

  test.describe('Product API Tests (via browser fetch)', () => {
    test('GET /api/product-info/styles returns styles array', async ({ page }) => {
      await navigateTo(page, '/products')
      const result = await apiGet(page, '/api/product-info/styles')

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('styles')
      expect(Array.isArray(result.data.styles)).toBe(true)
    })

    test('GET /api/product-info/fabrics returns fabrics array', async ({ page }) => {
      await navigateTo(page, '/products')
      const result = await apiGet(page, '/api/product-info/fabrics')

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('fabrics')
      expect(Array.isArray(result.data.fabrics)).toBe(true)
    })

    test('GET /api/product-info/raw-materials returns rawMaterials array', async ({ page }) => {
      await navigateTo(page, '/products')
      const result = await apiGet(page, '/api/product-info/raw-materials')

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('rawMaterials')
      expect(Array.isArray(result.data.rawMaterials)).toBe(true)
    })

    test('GET /api/product-info/packaging returns packaging array', async ({ page }) => {
      await navigateTo(page, '/products')
      const result = await apiGet(page, '/api/product-info/packaging')

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('packaging')
      expect(Array.isArray(result.data.packaging)).toBe(true)
    })

    test('GET /api/product-info/finished returns products array', async ({ page }) => {
      await navigateTo(page, '/products')
      const result = await apiGet(page, '/api/product-info/finished')

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('products')
      expect(Array.isArray(result.data.products)).toBe(true)
    })
  })

  test.describe('Cascading Dropdown API Tests (via browser fetch)', () => {
    test('GET /api/product-info/finished/categories returns categories array', async ({ page }) => {
      await navigateTo(page, '/products')
      const result = await apiGet(page, '/api/product-info/finished/categories')

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('categories')
      expect(Array.isArray(result.data.categories)).toBe(true)
    })

    test('GET /api/product-info/fabrics/materials returns materials array', async ({ page }) => {
      await navigateTo(page, '/products')
      const result = await apiGet(page, '/api/product-info/fabrics/materials')

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('materials')
      expect(Array.isArray(result.data.materials)).toBe(true)
    })
  })
})
