/**
 * Backfill Script: Update Stock Ledger SKU Fields
 * 
 * This script updates existing stock ledger entries and inventory batches
 * to populate the SKU field based on their productId and productType.
 * 
 * Run with: npx tsx scripts/backfill-sku.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillSKUs() {
    console.log('🔍 Starting SKU backfill process...\n')

    try {
        // Fetch all stock ledger entries with null SKU but having productId and productType
        const ledgerEntries = await prisma.stockLedger.findMany({
            where: {
                sku: null,
                productId: { not: null },
                productType: { not: null },
            },
            select: {
                id: true,
                productId: true,
                productType: true,
            },
        })

        console.log(`📊 Found ${ledgerEntries.length} stock ledger entries to update`)

        // Fetch all inventory batches with null SKU
        const batches = await prisma.inventoryBatch.findMany({
            where: {
                sku: null,
                productId: { not: null },
                productType: { not: null },
            },
            select: {
                id: true,
                productId: true,
                productType: true,
            },
        })

        console.log(`📦 Found ${batches.length} inventory batches to update\n`)

        let updatedLedgers = 0
        let updatedBatches = 0

        // Process in a transaction
        await prisma.$transaction(async (tx) => {
            // Update stock ledger entries
            for (const entry of ledgerEntries) {
                if (!entry.productId || !entry.productType) continue

                let sku: string | null = null

                if (entry.productType === 'fabric') {
                    const fabric = await tx.fabric.findUnique({
                        where: { id: entry.productId },
                        select: { fabricSku: true },
                    })
                    sku = fabric?.fabricSku || null
                } else if (entry.productType === 'raw_material') {
                    const rawMaterial = await tx.rawMaterial.findUnique({
                        where: { id: entry.productId },
                        select: { rmSku: true },
                    })
                    sku = rawMaterial?.rmSku || null
                } else if (entry.productType === 'packaging') {
                    const packaging = await tx.packaging.findUnique({
                        where: { id: entry.productId },
                        select: { pkgSku: true },
                    })
                    sku = packaging?.pkgSku || null
                } else if (entry.productType === 'finished') {
                    const finished = await tx.finishedProduct.findUnique({
                        where: { id: entry.productId },
                        select: { childSku: true },
                    })
                    sku = finished?.childSku || null
                }

                if (sku) {
                    await tx.stockLedger.update({
                        where: { id: entry.id },
                        data: { sku },
                    })
                    updatedLedgers++
                }
            }

            // Update inventory batches
            for (const batch of batches) {
                if (!batch.productId || !batch.productType) continue

                let sku: string | null = null

                if (batch.productType === 'fabric') {
                    const fabric = await tx.fabric.findUnique({
                        where: { id: batch.productId },
                        select: { fabricSku: true },
                    })
                    sku = fabric?.fabricSku || null
                } else if (batch.productType === 'raw_material') {
                    const rawMaterial = await tx.rawMaterial.findUnique({
                        where: { id: batch.productId },
                        select: { rmSku: true },
                    })
                    sku = rawMaterial?.rmSku || null
                } else if (batch.productType === 'packaging') {
                    const packaging = await tx.packaging.findUnique({
                        where: { id: batch.productId },
                        select: { pkgSku: true },
                    })
                    sku = packaging?.pkgSku || null
                } else if (batch.productType === 'finished') {
                    const finished = await tx.finishedProduct.findUnique({
                        where: { id: batch.productId },
                        select: { childSku: true },
                    })
                    sku = finished?.childSku || null
                }

                if (sku) {
                    await tx.inventoryBatch.update({
                        where: { id: batch.id },
                        data: { sku },
                    })
                    updatedBatches++
                }
            }
        })

        console.log('✅ Backfill completed successfully!')
        console.log(`   📝 Updated ${updatedLedgers} stock ledger entries`)
        console.log(`   📦 Updated ${updatedBatches} inventory batches`)
    } catch (error) {
        console.error('❌ Error during backfill:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Run the backfill
backfillSKUs()
    .then(() => {
        console.log('\n🎉 Done!')
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
