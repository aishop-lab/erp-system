import { PrismaClient } from '@prisma/client'
import { parseCSV, cleanValue } from './utils/csv-parser'

const prisma = new PrismaClient()

interface StyleData {
  styleId: string
  styleName: string
  gender: string
  category: string
}

export async function migrateStyles(tenantId: string) {
  console.log('\n========================================')
  console.log('  STYLE MIGRATION')
  console.log('========================================\n')

  // Parse finished items CSV to extract unique styles
  const finishedItems = await parseCSV('data/finished_items_rows.csv')

  // Extract unique styles
  const uniqueStylesMap = new Map<string, StyleData>()

  finishedItems.forEach((row) => {
    const styleId = cleanValue(row.style_id)
    const styleName = cleanValue(row.style_name)
    const gender = cleanValue(row.gender)
    const category = cleanValue(row.category)

    if (styleId && styleName && !uniqueStylesMap.has(styleId)) {
      uniqueStylesMap.set(styleId, {
        styleId,
        styleName,
        gender: gender || 'F',
        category: category || 'Blouse',
      })
    }
  })

  console.log(`  Found ${uniqueStylesMap.size} unique styles\n`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const [styleCode, styleData] of uniqueStylesMap) {
    try {
      // Check if style already exists
      const existing = await prisma.style.findFirst({
        where: {
          tenantId,
          styleCode,
        },
      })

      if (existing) {
        console.log(`  [SKIP] ${styleCode} - already exists`)
        skipped++
        continue
      }

      // Create style
      await prisma.style.create({
        data: {
          tenantId,
          styleCode,
          styleName: styleData.styleName,
          gender: styleData.gender,
          status: 'active',
        },
      })

      console.log(`  [OK] ${styleCode} - ${styleData.styleName}`)
      created++
    } catch (error: any) {
      console.error(`  [ERR] ${styleCode}: ${error.message}`)
      errors++
    }
  }

  console.log('\n  Style Migration Summary:')
  console.log(`    Created: ${created}`)
  console.log(`    Skipped: ${skipped}`)
  console.log(`    Errors:  ${errors}`)
  console.log(`    Total:   ${uniqueStylesMap.size}`)

  return { created, skipped, errors }
}

// Allow running standalone
if (require.main === module) {
  const tenantId = process.env.TENANT_ID
  if (!tenantId) {
    console.error('TENANT_ID environment variable is required')
    process.exit(1)
  }
  migrateStyles(tenantId)
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e)
      prisma.$disconnect()
      process.exit(1)
    })
}
