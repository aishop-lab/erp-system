import { PrismaClient } from '@prisma/client'
import { parseCSV, cleanValue, parseDecimal, normalizeGstRate } from './utils/csv-parser'

const prisma = new PrismaClient()

export async function migrateProducts(tenantId: string) {
  console.log('\n========================================')
  console.log('  FINISHED PRODUCTS MIGRATION')
  console.log('========================================\n')

  const productRows = await parseCSV('data/finished_items_rows.csv')

  // Pre-load styles and fabrics for faster lookups
  console.log('  Loading styles and fabrics for lookups...')
  const styles = await prisma.style.findMany({ where: { tenantId } })
  const fabrics = await prisma.fabric.findMany({ where: { tenantId } })
  const entities = await prisma.entity.findMany({ where: { tenantId } })

  const styleMap = new Map(styles.map((s) => [s.styleCode, s]))
  const fabricMap = new Map(fabrics.map((f) => [`${f.material}-${f.color}`, f]))
  const entityMap = new Map(entities.map((e) => [e.name, e]))

  console.log(`  Loaded ${styles.length} styles, ${fabrics.length} fabrics, ${entities.length} entities\n`)

  let created = 0
  let skipped = 0
  let errors = 0
  let styleNotFound = 0
  let fabricNotFound = 0

  for (const row of productRows) {
    const childSku = cleanValue(row.child_sku_id)
    const styleCode = cleanValue(row.style_id)
    const material = cleanValue(row.material)
    const color = cleanValue(row.color)
    const size = cleanValue(row.size)
    const title = cleanValue(row.title)

    if (!childSku || !styleCode || !material || !color || !size) {
      console.log(`  [SKIP] Missing required fields (SKU: ${childSku || 'unknown'})`)
      skipped++
      continue
    }

    try {
      // Check if product already exists
      const existing = await prisma.finishedProduct.findFirst({
        where: {
          tenantId,
          childSku,
        },
      })

      if (existing) {
        console.log(`  [SKIP] ${childSku} - already exists`)
        skipped++
        continue
      }

      // Find style
      const style = styleMap.get(styleCode)
      if (!style) {
        console.log(`  [SKIP] ${childSku} - Style '${styleCode}' not found`)
        styleNotFound++
        skipped++
        continue
      }

      // Find fabric by material and color
      const fabricKey = `${material}-${color}`
      const fabric = fabricMap.get(fabricKey)
      if (!fabric) {
        console.log(`  [SKIP] ${childSku} - Fabric '${fabricKey}' not found`)
        fabricNotFound++
        skipped++
        continue
      }

      // Find entity (optional)
      const entityName = cleanValue(row.entity)
      const entity = entityName ? entityMap.get(entityName) : null

      // Generate parent SKU (remove size suffix like -36, -44 etc)
      const parentSku = childSku.replace(/-\d+$/, '') || childSku

      // Determine selling channels based on which SKU fields have values
      const sellingChannels: string[] = []
      if (cleanValue(row.amazon_sku)) sellingChannels.push('AMAZON')
      if (cleanValue(row.myntra_sku)) sellingChannels.push('MYNTRA')
      if (cleanValue(row.shopify_sku)) sellingChannels.push('SHOPIFY')
      if (cleanValue(row.nykaa_sku)) sellingChannels.push('NYKAA')
      if (cleanValue(row.flipkart_sku)) sellingChannels.push('FLIPKART')

      // Create product
      const product = await prisma.finishedProduct.create({
        data: {
          tenantId,
          parentSku,
          childSku,
          styleId: style.id,
          fabricId: fabric.id,
          entityId: entity?.id || null,
          title: title || `${style.styleName} - ${color} - ${size}`,
          color,
          size,
          costAmount: parseDecimal(row.cost_amount) || 0,
          sellingPrice: parseDecimal(row.selling_price),
          mrp: parseDecimal(row.mrp_price),
          gstRatePct: normalizeGstRate(row.gst_rate_pct),
          currency: 'INR',
          sellingChannels: sellingChannels,
          status: 'active',
        },
      })

      // Create channel-specific records
      const amazonSku = cleanValue(row.amazon_sku)
      const amazonTitle = cleanValue(row.amazon_title)
      if (amazonSku || amazonTitle) {
        await prisma.productAmazon.create({
          data: {
            finishedProductId: product.id,
            itemName: amazonTitle || product.title,
          },
        })
      }

      const myntraSku = cleanValue(row.myntra_sku)
      const myntraTitle = cleanValue(row.myntra_title)
      const myntraProductCode = cleanValue(row.myntra_product_code)
      if (myntraSku || myntraTitle) {
        await prisma.productMyntra.create({
          data: {
            finishedProductId: product.id,
            myntraSku: myntraSku || myntraProductCode,
            productName: myntraTitle || product.title,
          },
        })
      }

      const shopifySku = cleanValue(row.shopify_sku)
      if (shopifySku) {
        await prisma.productShopify.create({
          data: {
            finishedProductId: product.id,
          },
        })
      }

      const nykaaSku = cleanValue(row.nykaa_sku)
      if (nykaaSku) {
        await prisma.productNykaa.create({
          data: {
            finishedProductId: product.id,
            nykaaSku,
          },
        })
      }

      const flipkartSku = cleanValue(row.flipkart_sku)
      if (flipkartSku) {
        await prisma.productFlipkart.create({
          data: {
            finishedProductId: product.id,
            flipkartSku,
          },
        })
      }

      console.log(`  [OK] ${childSku} - ${product.title.substring(0, 40)}...`)
      created++
    } catch (error: any) {
      console.error(`  [ERR] ${childSku}: ${error.message}`)
      errors++
    }
  }

  console.log('\n  Finished Products Migration Summary:')
  console.log(`    Created:         ${created}`)
  console.log(`    Skipped:         ${skipped}`)
  console.log(`    - Style missing: ${styleNotFound}`)
  console.log(`    - Fabric missing:${fabricNotFound}`)
  console.log(`    Errors:          ${errors}`)
  console.log(`    Total:           ${productRows.length}`)

  return { created, skipped, errors, styleNotFound, fabricNotFound }
}

if (require.main === module) {
  const tenantId = process.env.TENANT_ID
  if (!tenantId) {
    console.error('TENANT_ID environment variable is required')
    process.exit(1)
  }
  migrateProducts(tenantId)
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e)
      prisma.$disconnect()
      process.exit(1)
    })
}
