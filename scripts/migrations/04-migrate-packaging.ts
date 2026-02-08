import { PrismaClient } from '@prisma/client'
import { parseCSV, cleanValue, parseDecimal, parseInteger } from './utils/csv-parser'

const prisma = new PrismaClient()

export async function migratePackaging(tenantId: string) {
  console.log('\n========================================')
  console.log('  PACKAGING MIGRATION')
  console.log('========================================\n')

  const packagingRows = await parseCSV('data/packaging_items_rows.csv')

  let created = 0
  let skipped = 0
  let errors = 0

  for (const row of packagingRows) {
    // Handle both old and new column structures
    // Old: pack_sku_id, description, cost_per_unit
    // New: pkg_sku_id, pkg_type, measurement_unit, units_per_quantity, cost_per_sku
    const pkgSku = cleanValue(row.pkg_sku_id) || cleanValue(row.pack_sku_id)
    const pkgType = cleanValue(row.pkg_type) || cleanValue(row.description) || 'Unknown'
    const description = cleanValue(row.description)
    const channel = cleanValue(row.channel)
    const measurementUnit = cleanValue(row.measurement_unit) || 'Pieces'
    const unitsPerQuantity = parseInteger(row.units_per_quantity) || 1
    const costPerUnit = parseDecimal(row.cost_per_sku) || parseDecimal(row.cost_per_unit) || 0

    if (!pkgSku) {
      console.log(`  [SKIP] Missing SKU`)
      skipped++
      continue
    }

    try {
      // Check if packaging already exists
      const existing = await prisma.packaging.findFirst({
        where: {
          tenantId,
          pkgSku,
        },
      })

      if (existing) {
        console.log(`  [SKIP] ${pkgSku} - already exists`)
        skipped++
        continue
      }

      // Create packaging
      await prisma.packaging.create({
        data: {
          tenantId,
          pkgSku,
          pkgType,
          description,
          channel,
          measurementUnit,
          unitsPerQuantity,
          costPerUnit,
          gstRatePct: 5.0,
          status: 'active',
        },
      })

      console.log(`  [OK] ${pkgSku} - ${pkgType}`)
      created++
    } catch (error: any) {
      console.error(`  [ERR] ${pkgSku}: ${error.message}`)
      errors++
    }
  }

  console.log('\n  Packaging Migration Summary:')
  console.log(`    Created: ${created}`)
  console.log(`    Skipped: ${skipped}`)
  console.log(`    Errors:  ${errors}`)
  console.log(`    Total:   ${packagingRows.length}`)

  return { created, skipped, errors }
}

if (require.main === module) {
  const tenantId = process.env.TENANT_ID
  if (!tenantId) {
    console.error('TENANT_ID environment variable is required')
    process.exit(1)
  }
  migratePackaging(tenantId)
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e)
      prisma.$disconnect()
      process.exit(1)
    })
}
