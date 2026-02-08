import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function rollback(tenantId: string) {
  console.log('\n')
  console.log('========================================')
  console.log('  MIGRATION ROLLBACK')
  console.log('========================================')
  console.log(`\n  Tenant ID: ${tenantId}\n`)

  const confirmRollback = process.env.CONFIRM_ROLLBACK === 'yes'

  if (!confirmRollback) {
    console.log('  WARNING: This will DELETE all migrated data!')
    console.log('  To proceed, set CONFIRM_ROLLBACK=yes\n')
    console.log('  Example:')
    console.log('    TENANT_ID=xxx CONFIRM_ROLLBACK=yes npm run migrate:rollback\n')
    process.exit(0)
  }

  console.log('  Rolling back migration...\n')

  try {
    // Delete in reverse order (due to foreign keys)
    console.log('  Deleting channel-specific data...')
    const amazonDeleted = await prisma.productAmazon.deleteMany({
      where: { finishedProduct: { tenantId } },
    })
    console.log(`    - Amazon: ${amazonDeleted.count} records`)

    const myntraDeleted = await prisma.productMyntra.deleteMany({
      where: { finishedProduct: { tenantId } },
    })
    console.log(`    - Myntra: ${myntraDeleted.count} records`)

    const shopifyDeleted = await prisma.productShopify.deleteMany({
      where: { finishedProduct: { tenantId } },
    })
    console.log(`    - Shopify: ${shopifyDeleted.count} records`)

    const flipkartDeleted = await prisma.productFlipkart.deleteMany({
      where: { finishedProduct: { tenantId } },
    })
    console.log(`    - Flipkart: ${flipkartDeleted.count} records`)

    const nykaaDeleted = await prisma.productNykaa.deleteMany({
      where: { finishedProduct: { tenantId } },
    })
    console.log(`    - Nykaa: ${nykaaDeleted.count} records`)

    console.log('\n  Deleting finished products...')
    const productsDeleted = await prisma.finishedProduct.deleteMany({
      where: { tenantId },
    })
    console.log(`    - Products: ${productsDeleted.count} records`)

    console.log('\n  Deleting packaging...')
    const packagingDeleted = await prisma.packaging.deleteMany({
      where: { tenantId },
    })
    console.log(`    - Packaging: ${packagingDeleted.count} records`)

    console.log('\n  Deleting raw materials...')
    const rawMaterialsDeleted = await prisma.rawMaterial.deleteMany({
      where: { tenantId },
    })
    console.log(`    - Raw Materials: ${rawMaterialsDeleted.count} records`)

    console.log('\n  Deleting fabrics...')
    const fabricsDeleted = await prisma.fabric.deleteMany({
      where: { tenantId },
    })
    console.log(`    - Fabrics: ${fabricsDeleted.count} records`)

    console.log('\n  Deleting styles...')
    const stylesDeleted = await prisma.style.deleteMany({
      where: { tenantId },
    })
    console.log(`    - Styles: ${stylesDeleted.count} records`)

    console.log('\n  Rollback complete!\n')
  } catch (error) {
    console.error('\n  Rollback failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const tenantId = process.env.TENANT_ID
if (!tenantId) {
  console.error('ERROR: TENANT_ID environment variable is required')
  process.exit(1)
}

rollback(tenantId)
