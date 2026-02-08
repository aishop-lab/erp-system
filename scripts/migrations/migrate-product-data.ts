import { PrismaClient } from '@prisma/client'
import { migrateStyles } from './01-migrate-styles'
import { migrateFabrics } from './02-migrate-fabrics'
import { migrateRawMaterials } from './03-migrate-raw-materials'
import { migratePackaging } from './04-migrate-packaging'
import { migrateProducts } from './05-migrate-products'

const prisma = new PrismaClient()

async function main() {
  const tenantId = process.env.TENANT_ID

  if (!tenantId) {
    console.error('ERROR: TENANT_ID environment variable is required')
    console.error('Usage: TENANT_ID=your-tenant-id npm run migrate:products')
    process.exit(1)
  }

  console.log('\n')
  console.log('========================================')
  console.log('  PRODUCT DATA MIGRATION')
  console.log('========================================')
  console.log(`\n  Tenant ID: ${tenantId}\n`)

  const results = {
    styles: { created: 0, skipped: 0, errors: 0 },
    fabrics: { created: 0, skipped: 0, errors: 0 },
    rawMaterials: { created: 0, skipped: 0, errors: 0 },
    packaging: { created: 0, skipped: 0, errors: 0 },
    products: { created: 0, skipped: 0, errors: 0 },
  }

  try {
    // Step 1: Migrate Styles (extracted from finished items)
    results.styles = await migrateStyles(tenantId)

    // Step 2: Migrate Fabrics
    results.fabrics = await migrateFabrics(tenantId)

    // Step 3: Migrate Raw Materials
    results.rawMaterials = await migrateRawMaterials(tenantId)

    // Step 4: Migrate Packaging
    results.packaging = await migratePackaging(tenantId)

    // Step 5: Migrate Finished Products (requires styles + fabrics)
    results.products = await migrateProducts(tenantId)

    // Final Summary
    console.log('\n')
    console.log('========================================')
    console.log('  MIGRATION COMPLETE')
    console.log('========================================')
    console.log('\n  Final Summary:')
    console.log('  +-----------------+----------+----------+----------+')
    console.log('  | Library         | Created  | Skipped  | Errors   |')
    console.log('  +-----------------+----------+----------+----------+')
    console.log(`  | Styles          | ${String(results.styles.created).padStart(8)} | ${String(results.styles.skipped).padStart(8)} | ${String(results.styles.errors).padStart(8)} |`)
    console.log(`  | Fabrics         | ${String(results.fabrics.created).padStart(8)} | ${String(results.fabrics.skipped).padStart(8)} | ${String(results.fabrics.errors).padStart(8)} |`)
    console.log(`  | Raw Materials   | ${String(results.rawMaterials.created).padStart(8)} | ${String(results.rawMaterials.skipped).padStart(8)} | ${String(results.rawMaterials.errors).padStart(8)} |`)
    console.log(`  | Packaging       | ${String(results.packaging.created).padStart(8)} | ${String(results.packaging.skipped).padStart(8)} | ${String(results.packaging.errors).padStart(8)} |`)
    console.log(`  | Finished Prods  | ${String(results.products.created).padStart(8)} | ${String(results.products.skipped).padStart(8)} | ${String(results.products.errors).padStart(8)} |`)
    console.log('  +-----------------+----------+----------+----------+')
    console.log('\n')

    const totalErrors =
      results.styles.errors +
      results.fabrics.errors +
      results.rawMaterials.errors +
      results.packaging.errors +
      results.products.errors

    if (totalErrors > 0) {
      console.log(`  WARNING: ${totalErrors} errors occurred during migration.`)
      console.log('  Review the logs above for details.\n')
    } else {
      console.log('  All migrations completed successfully!\n')
    }
  } catch (error) {
    console.error('\n  MIGRATION FAILED:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
