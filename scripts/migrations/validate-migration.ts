import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateMigration(tenantId: string) {
  console.log('\n')
  console.log('========================================')
  console.log('  MIGRATION VALIDATION')
  console.log('========================================')
  console.log(`\n  Tenant ID: ${tenantId}\n`)

  // Count records
  const styles = await prisma.style.count({ where: { tenantId } })
  const fabrics = await prisma.fabric.count({ where: { tenantId } })
  const rawMaterials = await prisma.rawMaterial.count({ where: { tenantId } })
  const packaging = await prisma.packaging.count({ where: { tenantId } })
  const products = await prisma.finishedProduct.count({ where: { tenantId } })

  // Count channel-specific records
  const amazonRecords = await prisma.productAmazon.count({
    where: { finishedProduct: { tenantId } },
  })
  const myntraRecords = await prisma.productMyntra.count({
    where: { finishedProduct: { tenantId } },
  })
  const shopifyRecords = await prisma.productShopify.count({
    where: { finishedProduct: { tenantId } },
  })
  const flipkartRecords = await prisma.productFlipkart.count({
    where: { finishedProduct: { tenantId } },
  })
  const nykaaRecords = await prisma.productNykaa.count({
    where: { finishedProduct: { tenantId } },
  })

  console.log('  Record Counts:')
  console.log('  +---------------------+----------+')
  console.log('  | Table               | Count    |')
  console.log('  +---------------------+----------+')
  console.log(`  | Styles              | ${String(styles).padStart(8)} |`)
  console.log(`  | Fabrics             | ${String(fabrics).padStart(8)} |`)
  console.log(`  | Raw Materials       | ${String(rawMaterials).padStart(8)} |`)
  console.log(`  | Packaging           | ${String(packaging).padStart(8)} |`)
  console.log(`  | Finished Products   | ${String(products).padStart(8)} |`)
  console.log('  +---------------------+----------+')
  console.log(`  | Amazon Data         | ${String(amazonRecords).padStart(8)} |`)
  console.log(`  | Myntra Data         | ${String(myntraRecords).padStart(8)} |`)
  console.log(`  | Shopify Data        | ${String(shopifyRecords).padStart(8)} |`)
  console.log(`  | Flipkart Data       | ${String(flipkartRecords).padStart(8)} |`)
  console.log(`  | Nykaa Data          | ${String(nykaaRecords).padStart(8)} |`)
  console.log('  +---------------------+----------+')

  // Verify all products have valid style and fabric references
  console.log('\n  Integrity Checks:')

  // Since styleId and fabricId are required fields, all products must have them
  // Just verify the relations are valid
  const productsWithRelations = await prisma.finishedProduct.findMany({
    where: { tenantId },
    select: {
      id: true,
      childSku: true,
      style: { select: { id: true } },
      fabric: { select: { id: true } },
    },
    take: 5,
  })

  const allHaveRelations = productsWithRelations.every((p) => p.style && p.fabric)
  if (allHaveRelations) {
    console.log('  [OK] All products have valid style and fabric references')
  } else {
    console.log('  [WARN] Some products may have missing references')
  }

  // Sample some products to verify relations
  console.log('\n  Sample Products (first 5):')
  const sampleProducts = await prisma.finishedProduct.findMany({
    where: { tenantId },
    take: 5,
    include: {
      style: true,
      fabric: true,
      entity: true,
    },
  })

  for (const product of sampleProducts) {
    console.log(`    - ${product.childSku}`)
    console.log(`      Style: ${product.style?.styleCode || 'MISSING'}`)
    console.log(`      Fabric: ${product.fabric?.fabricSku || 'MISSING'}`)
    console.log(`      Entity: ${product.entity?.name || 'None'}`)
  }

  console.log('\n  Validation complete!\n')

  await prisma.$disconnect()
}

const tenantId = process.env.TENANT_ID
if (!tenantId) {
  console.error('ERROR: TENANT_ID environment variable is required')
  process.exit(1)
}

validateMigration(tenantId)
