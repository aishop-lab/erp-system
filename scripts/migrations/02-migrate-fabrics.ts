import { PrismaClient } from '@prisma/client'
import { parseCSV, cleanValue, parseDecimal, normalizeGstRate } from './utils/csv-parser'

const prisma = new PrismaClient()

export async function migrateFabrics(tenantId: string) {
  console.log('\n========================================')
  console.log('  FABRIC MIGRATION')
  console.log('========================================\n')

  const fabricRows = await parseCSV('data/fabric_items_rows.csv')

  let created = 0
  let skipped = 0
  let errors = 0

  for (const row of fabricRows) {
    const fabricSku = cleanValue(row.fab_sku)
    const material = cleanValue(row.material)
    const color = cleanValue(row.color)

    if (!fabricSku || !material || !color) {
      console.log(`  [SKIP] Missing required fields (SKU: ${fabricSku || 'unknown'})`)
      skipped++
      continue
    }

    try {
      // Check if fabric already exists
      const existing = await prisma.fabric.findFirst({
        where: {
          tenantId,
          fabricSku,
        },
      })

      if (existing) {
        console.log(`  [SKIP] ${fabricSku} - already exists`)
        skipped++
        continue
      }

      // Create fabric
      await prisma.fabric.create({
        data: {
          tenantId,
          fabricSku,
          material,
          color,
          design: cleanValue(row.design),
          work: cleanValue(row.work),
          widthCm: parseDecimal(row.width_cm),
          weightPerMeter: parseDecimal(row.weight_per_meter),
          costAmount: parseDecimal(row.cost_amount) || 0,
          gstRatePct: normalizeGstRate(row.gst_rate_pct),
          uom: 'Meters',
          status: 'active',
        },
      })

      console.log(`  [OK] ${fabricSku} - ${material} ${color}`)
      created++
    } catch (error: any) {
      console.error(`  [ERR] ${fabricSku}: ${error.message}`)
      errors++
    }
  }

  console.log('\n  Fabric Migration Summary:')
  console.log(`    Created: ${created}`)
  console.log(`    Skipped: ${skipped}`)
  console.log(`    Errors:  ${errors}`)
  console.log(`    Total:   ${fabricRows.length}`)

  return { created, skipped, errors }
}

if (require.main === module) {
  const tenantId = process.env.TENANT_ID
  if (!tenantId) {
    console.error('TENANT_ID environment variable is required')
    process.exit(1)
  }
  migrateFabrics(tenantId)
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e)
      prisma.$disconnect()
      process.exit(1)
    })
}
