import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Missing fabrics based on material-color combinations in finished_items_rows.csv
// that don't exist in the current fabric library
const missingFabrics = [
  { fabricSku: 'FAB1032', material: 'Rayon', color: 'Gulabi', costAmount: 68.00 },
  { fabricSku: 'FAB1033', material: 'Foil', color: 'Gold Foil', costAmount: 150.00 },
  { fabricSku: 'FAB1034', material: 'Foil', color: 'Silver Foil', costAmount: 150.00 },
  { fabricSku: 'FAB1035', material: 'Dupion Silk', color: 'Silk Beige', costAmount: 120.00 },
  { fabricSku: 'FAB1036', material: 'Dupion Silk', color: 'Silk Black', costAmount: 120.00 },
  { fabricSku: 'FAB1037', material: 'Dupion Silk', color: 'Silk Cream', costAmount: 120.00 },
  { fabricSku: 'FAB1038', material: 'Dupion Silk', color: 'Silk Maroon', costAmount: 120.00 },
  { fabricSku: 'FAB1039', material: 'Dupion Silk', color: 'Silk Pear Green', costAmount: 120.00 },
  { fabricSku: 'FAB1040', material: 'Velvet', color: 'Velvet Black', costAmount: 200.00 },
  { fabricSku: 'FAB1041', material: 'Lurex - Thick Line', color: 'Festive Black', costAmount: 180.00 },
  { fabricSku: 'FAB1042', material: 'Lurex - Thick Line', color: 'Festive Pink', costAmount: 180.00 },
  { fabricSku: 'FAB1043', material: 'Lurex - Thick Line', color: 'Festive White', costAmount: 180.00 },
  { fabricSku: 'FAB1044', material: 'Lurex - Thick Line', color: 'Festive Yellow', costAmount: 180.00 },
]

async function addMissingFabrics(tenantId: string) {
  console.log('\n========================================')
  console.log('  ADDING MISSING FABRICS')
  console.log('========================================\n')
  console.log(`  Tenant ID: ${tenantId}\n`)

  let created = 0
  let skipped = 0

  for (const fabric of missingFabrics) {
    try {
      // Check if fabric already exists
      const existing = await prisma.fabric.findFirst({
        where: {
          tenantId,
          fabricSku: fabric.fabricSku,
        },
      })

      if (existing) {
        console.log(`  [SKIP] ${fabric.fabricSku} - already exists`)
        skipped++
        continue
      }

      // Also check if material-color combo exists
      const existingCombo = await prisma.fabric.findFirst({
        where: {
          tenantId,
          material: fabric.material,
          color: fabric.color,
        },
      })

      if (existingCombo) {
        console.log(`  [SKIP] ${fabric.material}-${fabric.color} - combination already exists as ${existingCombo.fabricSku}`)
        skipped++
        continue
      }

      await prisma.fabric.create({
        data: {
          tenantId,
          fabricSku: fabric.fabricSku,
          material: fabric.material,
          color: fabric.color,
          costAmount: fabric.costAmount,
          gstRatePct: 5.0,
          uom: 'Meters',
          status: 'active',
        },
      })

      console.log(`  [OK] ${fabric.fabricSku} - ${fabric.material} ${fabric.color}`)
      created++
    } catch (error: any) {
      console.error(`  [ERR] ${fabric.fabricSku}: ${error.message}`)
    }
  }

  console.log('\n  Summary:')
  console.log(`    Created: ${created}`)
  console.log(`    Skipped: ${skipped}`)
  console.log(`    Total:   ${missingFabrics.length}\n`)

  return { created, skipped }
}

async function main() {
  const tenantId = process.env.TENANT_ID
  if (!tenantId) {
    console.error('ERROR: TENANT_ID environment variable is required')
    process.exit(1)
  }

  try {
    await addMissingFabrics(tenantId)
  } finally {
    await prisma.$disconnect()
  }
}

main()
