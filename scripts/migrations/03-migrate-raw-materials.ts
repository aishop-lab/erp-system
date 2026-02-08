import { PrismaClient } from '@prisma/client'
import { parseCSV, cleanValue, parseDecimal, parseInteger } from './utils/csv-parser'

const prisma = new PrismaClient()

export async function migrateRawMaterials(tenantId: string) {
  console.log('\n========================================')
  console.log('  RAW MATERIAL MIGRATION')
  console.log('========================================\n')

  const rmRows = await parseCSV('data/raw_material_items_rows.csv')

  let created = 0
  let skipped = 0
  let errors = 0

  for (const row of rmRows) {
    const rmSku = cleanValue(row.rm_sku_id)
    const rmType = cleanValue(row.rm_type)
    const measurementUnit = cleanValue(row.measurement_unit)
    const unitsPerQuantity = parseInteger(row.units_per_quantity)
    const costPerSku = parseDecimal(row.cost_per_sku)

    if (!rmSku || !rmType) {
      console.log(`  [SKIP] Missing required fields (SKU: ${rmSku || 'unknown'})`)
      skipped++
      continue
    }

    try {
      // Check if raw material already exists
      const existing = await prisma.rawMaterial.findFirst({
        where: {
          tenantId,
          rmSku,
        },
      })

      if (existing) {
        console.log(`  [SKIP] ${rmSku} - already exists`)
        skipped++
        continue
      }

      // Create raw material
      await prisma.rawMaterial.create({
        data: {
          tenantId,
          rmSku,
          rmType,
          color: cleanValue(row.color),
          measurementUnit: measurementUnit || 'Pieces',
          unitsPerQuantity: unitsPerQuantity || 1,
          costPerSku: costPerSku || 0,
          gstRatePct: 5.0,
          status: 'active',
        },
      })

      console.log(`  [OK] ${rmSku} - ${rmType}`)
      created++
    } catch (error: any) {
      console.error(`  [ERR] ${rmSku}: ${error.message}`)
      errors++
    }
  }

  console.log('\n  Raw Material Migration Summary:')
  console.log(`    Created: ${created}`)
  console.log(`    Skipped: ${skipped}`)
  console.log(`    Errors:  ${errors}`)
  console.log(`    Total:   ${rmRows.length}`)

  return { created, skipped, errors }
}

if (require.main === module) {
  const tenantId = process.env.TENANT_ID
  if (!tenantId) {
    console.error('TENANT_ID environment variable is required')
    process.exit(1)
  }
  migrateRawMaterials(tenantId)
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e)
      prisma.$disconnect()
      process.exit(1)
    })
}
