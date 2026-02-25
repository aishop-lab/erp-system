import { prisma } from '@/lib/prisma'
import { ProductionStatus, ProductionType, POStatus } from '@prisma/client'
import type { CreateProductionInput, CompleteProductionInput, RMIssuanceInput } from '@/validators/production'

export async function getProductions(tenantId: string, params?: {
  productionType?: ProductionType
  status?: ProductionStatus
  search?: string
  page?: number
  pageSize?: number
}) {
  const { productionType, status, search, page = 1, pageSize = 20 } = params || {}

  const where = {
    tenantId,
    ...(productionType && { productionType }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { productionNumber: { contains: search, mode: 'insensitive' as const } },
        { productName: { contains: search, mode: 'insensitive' as const } },
        { sku: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [productions, total] = await Promise.all([
    prisma.production.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        completedByUser: { select: { id: true, name: true } },
        _count: { select: { materials: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.production.count({ where }),
  ])

  return {
    data: productions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getProductionById(id: string, tenantId: string) {
  return prisma.production.findFirst({
    where: { id, tenantId },
    include: {
      createdBy: { select: { id: true, name: true } },
      completedByUser: { select: { id: true, name: true } },
      materials: true,
    },
  })
}

export async function createProduction(tenantId: string, userId: string, data: CreateProductionInput) {
  const { materials, ...productionData } = data

  // Generate production number
  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const prefix = data.productionType === 'in_house' ? 'PRD' : 'JWK'

  const lastProduction = await prisma.production.findFirst({
    where: {
      tenantId,
      productionNumber: { startsWith: `${prefix}-${year}${month}` },
    },
    orderBy: { productionNumber: 'desc' },
  })

  let sequence = 1
  if (lastProduction) {
    const lastSequence = parseInt(lastProduction.productionNumber.split('-').pop() || '0')
    sequence = lastSequence + 1
  }

  const productionNumber = `${prefix}-${year}${month}-${sequence.toString().padStart(4, '0')}`

  return prisma.production.create({
    data: {
      tenantId,
      productionNumber,
      productionType: data.productionType as ProductionType,
      outputProductId: data.outputProductId,
      outputQuantity: data.outputQuantity,
      sku: data.sku,
      productName: data.productName,
      plannedQty: data.plannedQty,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      productionLine: data.productionLine,
      location: data.location,
      notes: data.notes,
      createdById: userId,
      materials: materials ? {
        create: materials.map((m) => ({
          productId: m.productId,
          quantity: m.quantity,
          batchId: m.batchId,
        })),
      } : undefined,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      materials: true,
    },
  })
}

export async function completeProduction(
  id: string,
  tenantId: string,
  userId: string,
  data: CompleteProductionInput
) {
  const production = await prisma.production.findFirst({
    where: { id, tenantId },
    include: { materials: true },
  })

  if (!production) {
    throw new Error('Production order not found')
  }

  if (production.status === ProductionStatus.completed) {
    throw new Error('Production is already completed')
  }

  if (production.status === ProductionStatus.cancelled) {
    throw new Error('Cannot complete a cancelled production')
  }

  return prisma.$transaction(async (tx) => {
    // 1. Consume materials (if not already consumed via materials_issued)
    if (production.status !== ProductionStatus.materials_issued) {
      for (const material of production.materials) {
        if (material.batchId) {
          const batch = await tx.inventoryBatch.findUnique({
            where: { id: material.batchId },
          })

          if (!batch || Number(batch.currentQty) < material.quantity) {
            throw new Error(
              `Insufficient inventory in batch ${material.batchId}: available ${batch ? Number(batch.currentQty) : 0}, required ${material.quantity}`
            )
          }

          const batchBalance = Number(batch.currentQty) - material.quantity

          // Query running skuBalance
          const lastSkuEntry = batch.sku ? await tx.stockLedger.findFirst({
            where: { tenantId, sku: batch.sku },
            orderBy: { createdAt: 'desc' },
            select: { skuBalance: true },
          }) : null
          const prevSkuBalance = lastSkuEntry ? Number(lastSkuEntry.skuBalance) : 0

          await tx.stockLedger.create({
            data: {
              tenantId,
              productId: material.productId,
              batchId: material.batchId,
              sku: batch.sku,
              movementType: 'production_out',
              referenceType: 'production',
              referenceId: production.id,
              referenceNumber: production.productionNumber,
              qtyIn: 0,
              qtyOut: material.quantity,
              batchBalance,
              skuBalance: prevSkuBalance - material.quantity,
              notes: `Production ${production.productionNumber} - consumed ${material.quantity} units`,
              createdBy: userId,
            },
          })

          await tx.inventoryBatch.update({
            where: { id: material.batchId },
            data: {
              currentQty: { decrement: material.quantity },
            },
          })
        }
      }
    }

    // 2. Calculate material costs from actual product prices
    let materialCost = 0
    for (const material of production.materials) {
      let unitCost = 0
      if (material.productId) {
        // Look up cost from the product catalog tables
        const finishedP = await tx.finishedProduct.findUnique({
          where: { id: material.productId },
          select: { costAmount: true },
        }).catch(() => null)
        if (finishedP?.costAmount) {
          unitCost = Number(finishedP.costAmount)
        } else {
          const fabric = await tx.fabric.findUnique({
            where: { id: material.productId },
            select: { costAmount: true },
          }).catch(() => null)
          if (fabric?.costAmount) {
            unitCost = Number(fabric.costAmount)
          } else {
            const rawMaterial = await tx.rawMaterial.findUnique({
              where: { id: material.productId },
              select: { costPerSku: true },
            }).catch(() => null)
            if (rawMaterial?.costPerSku) {
              unitCost = Number(rawMaterial.costPerSku)
            } else {
              const packaging = await tx.packaging.findUnique({
                where: { id: material.productId },
                select: { costPerUnit: true },
              }).catch(() => null)
              if (packaging?.costPerUnit) {
                unitCost = Number(packaging.costPerUnit)
              }
            }
          }
        }
      }
      materialCost += unitCost * material.quantity
    }
    const totalCost = materialCost + Number(data.laborCost || 0) + Number(data.overheadCost || 0)
    const costPerUnit = Number(data.actualQty) > 0 ? totalCost / Number(data.actualQty) : 0

    // 3. Create output inventory batch if we have an output product
    let outputBatch = null
    if (production.outputProductId && Number(data.actualQty) > 0) {
      const batchMonth = new Date().toISOString().slice(2, 7).replace('-', '')
      const sku = production.sku || 'PROD'
      const batchNumber = `${sku}-${batchMonth}-${production.productionNumber.split('-').pop()}`

      // Look up product type and SKU
      let productType = 'finished'
      let productSku = production.sku

      // Try to find the product to determine type and SKU
      const finishedProduct = await tx.finishedProduct.findUnique({
        where: { id: production.outputProductId },
        select: { childSku: true },
      }).catch(() => null)

      if (finishedProduct) {
        productType = 'finished'
        productSku = finishedProduct.childSku || productSku
      }

      outputBatch = await tx.inventoryBatch.create({
        data: {
          tenantId,
          productId: production.outputProductId,
          productType,
          sku: productSku,
          batchNumber,
          productionId: production.id,
          initialQty: data.actualQty,
          currentQty: data.actualQty,
          status: 'active',
        },
      })

      // Query running skuBalance for output SKU
      const lastOutputSkuEntry = productSku ? await tx.stockLedger.findFirst({
        where: { tenantId, sku: productSku },
        orderBy: { createdAt: 'desc' },
        select: { skuBalance: true },
      }) : null
      const prevOutputSkuBalance = lastOutputSkuEntry ? Number(lastOutputSkuEntry.skuBalance) : 0

      await tx.stockLedger.create({
        data: {
          tenantId,
          productId: production.outputProductId,
          productType,
          sku: productSku,
          batchId: outputBatch.id,
          batchNumber,
          movementType: 'production_in',
          referenceType: 'production',
          referenceId: production.id,
          referenceNumber: production.productionNumber,
          qtyIn: data.actualQty,
          qtyOut: 0,
          batchBalance: data.actualQty,
          skuBalance: prevOutputSkuBalance + Number(data.actualQty),
          notes: `Production completed: ${production.productionNumber} - produced ${data.actualQty} units`,
          createdBy: userId,
        },
      })
    }

    // 4. Update production order
    const updated = await tx.production.update({
      where: { id },
      data: {
        actualQty: data.actualQty,
        rejectedQty: data.rejectedQty || 0,
        wasteQty: data.wasteQty || 0,
        completionDate: new Date(),
        status: ProductionStatus.completed,
        materialCost,
        laborCost: data.laborCost,
        overheadCost: data.overheadCost,
        totalCost,
        costPerUnit,
        notes: data.notes || production.notes,
        completedBy: userId,
        completedById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        completedByUser: { select: { id: true, name: true } },
        materials: true,
      },
    })

    return { production: updated, outputBatch }
  })
}

export async function updateProductionStatus(
  id: string,
  tenantId: string,
  status: ProductionStatus,
  userId?: string
) {
  const production = await prisma.production.findFirst({
    where: { id, tenantId },
    include: { materials: true },
  })

  if (!production) {
    throw new Error('Production not found')
  }

  return prisma.$transaction(async (tx) => {
    // If completing production, update stock ledger
    if (status === ProductionStatus.completed && production.status !== ProductionStatus.completed) {
      const createdBy = userId || production.createdById

      // Record materials consumed
      for (const material of production.materials) {
        if (material.batchId) {
          const batch = await tx.inventoryBatch.findUnique({
            where: { id: material.batchId },
          })

          if (!batch || Number(batch.currentQty) < material.quantity) {
            throw new Error(
              `Insufficient inventory in batch ${material.batchId}: available ${batch ? Number(batch.currentQty) : 0}, required ${material.quantity}`
            )
          }

          const batchBalance = Number(batch.currentQty) - material.quantity

          // Query running skuBalance
          const lastSkuEntry2 = batch.sku ? await tx.stockLedger.findFirst({
            where: { tenantId, sku: batch.sku },
            orderBy: { createdAt: 'desc' },
            select: { skuBalance: true },
          }) : null
          const prevSkuBalance2 = lastSkuEntry2 ? Number(lastSkuEntry2.skuBalance) : 0

          await tx.stockLedger.create({
            data: {
              tenantId,
              productId: material.productId,
              batchId: material.batchId,
              sku: batch.sku,
              movementType: 'production_out',
              referenceType: 'production',
              referenceId: production.id,
              referenceNumber: production.productionNumber,
              qtyIn: 0,
              qtyOut: material.quantity,
              batchBalance,
              skuBalance: prevSkuBalance2 - material.quantity,
              notes: `Production ${production.productionNumber} - consumed ${material.quantity} units`,
              createdBy,
            },
          })

          await tx.inventoryBatch.update({
            where: { id: material.batchId },
            data: {
              currentQty: { decrement: material.quantity },
            },
          })
        }
      }

      // Record output product if specified
      if (production.outputProductId && production.outputQuantity) {
        // Query running skuBalance for output
        const outputSku = production.sku
        const lastOutputEntry = outputSku ? await tx.stockLedger.findFirst({
          where: { tenantId, sku: outputSku },
          orderBy: { createdAt: 'desc' },
          select: { skuBalance: true },
        }) : null
        const prevOutputBal = lastOutputEntry ? Number(lastOutputEntry.skuBalance) : 0

        await tx.stockLedger.create({
          data: {
            tenantId,
            productId: production.outputProductId,
            sku: outputSku,
            movementType: 'production_in',
            referenceType: 'production',
            referenceId: production.id,
            referenceNumber: production.productionNumber,
            qtyIn: production.outputQuantity,
            qtyOut: 0,
            batchBalance: production.outputQuantity,
            skuBalance: prevOutputBal + production.outputQuantity,
            notes: `Production ${production.productionNumber} - produced ${production.outputQuantity} units`,
            createdBy,
          },
        })
      }
    }

    return tx.production.update({
      where: { id },
      data: { status },
    })
  })
}

export async function getEligiblePOsForRMIssuance(tenantId: string) {
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      tenantId,
      rawMaterialMode: 'raw_materials_issued',
      status: {
        in: [POStatus.approved, POStatus.approved_pending_rm_issuance],
      },
    },
    include: {
      supplier: {
        select: { id: true, code: true, name: true },
      },
      lineItems: true,
      rmIssuances: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return pos.map(po => ({
    ...po,
    totalAmount: Number(po.totalAmount),
    grandTotal: Number(po.grandTotal),
    rmIssued: po.rmIssuances.length > 0,
  }))
}

export async function getAvailableBatches(tenantId: string, params?: {
  productType?: string
  productId?: string
  search?: string
}) {
  const { productType, productId, search } = params || {}

  const where = {
    tenantId,
    currentQty: { gt: 0 },
    status: 'active',
    ...(productType && { productType }),
    ...(productId && { productId }),
    ...(search && {
      OR: [
        { sku: { contains: search, mode: 'insensitive' as const } },
        { batchNumber: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const batches = await prisma.inventoryBatch.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return batches.map(b => ({
    id: b.id,
    productId: b.productId,
    productType: b.productType,
    sku: b.sku,
    batchNumber: b.batchNumber,
    currentQty: Number(b.currentQty),
    initialQty: Number(b.initialQty),
    status: b.status,
    createdAt: b.createdAt,
  }))
}

export async function issueRawMaterials(tenantId: string, userId: string, data: RMIssuanceInput) {
  const po = await prisma.purchaseOrder.findFirst({
    where: {
      id: data.purchaseOrderId,
      tenantId,
      rawMaterialMode: 'raw_materials_issued',
      status: { in: ['approved', 'approved_pending_rm_issuance'] },
    },
  })

  if (!po) {
    throw new Error('Purchase order not found or not eligible for RM issuance')
  }

  // Generate issuance number
  const issuanceNumber = `RMI-${po.poNumber}-${Date.now().toString().slice(-6)}`

  return prisma.$transaction(async (tx) => {
    // Look up batch details to get productType for each item
    const itemsWithType = await Promise.all(
      data.items.map(async (item) => {
        let productType: string | null = null
        if (item.batchId) {
          const batch = await tx.inventoryBatch.findUnique({
            where: { id: item.batchId },
            select: { productType: true },
          })
          productType = batch?.productType || null
        }
        return { ...item, productType }
      })
    )

    const issuance = await tx.pORmIssuance.create({
      data: {
        purchaseOrderId: data.purchaseOrderId,
        issuanceNumber,
        notes: data.notes,
        items: {
          create: itemsWithType.map((item) => ({
            productId: item.productId,
            productType: item.productType,
            quantity: item.quantity,
            batchId: item.batchId,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    // Create stock ledger entries and update batches
    for (const item of data.items) {
      if (item.batchId) {
        const batch = await tx.inventoryBatch.findUnique({
          where: { id: item.batchId },
        })

        if (!batch || Number(batch.currentQty) < item.quantity) {
          throw new Error(
            `Insufficient inventory in batch ${item.batchId}: available ${batch ? Number(batch.currentQty) : 0}, required ${item.quantity}`
          )
        }

        const batchBalance = Number(batch.currentQty) - item.quantity

        // Query running skuBalance
        const lastSkuEntry = await tx.stockLedger.findFirst({
          where: { tenantId, sku: batch.sku },
          orderBy: { createdAt: 'desc' },
          select: { skuBalance: true },
        })
        const prevSkuBalance = lastSkuEntry ? Number(lastSkuEntry.skuBalance) : 0

        await tx.stockLedger.create({
          data: {
            tenantId,
            productId: item.productId,
            batchId: item.batchId,
            sku: batch.sku,
            movementType: 'rm_issued_to_vendor',
            referenceType: 'rm_issuance',
            referenceId: issuance.id,
            referenceNumber: issuanceNumber,
            qtyIn: 0,
            qtyOut: item.quantity,
            batchBalance,
            skuBalance: prevSkuBalance - item.quantity,
            notes: `RM Issuance ${issuanceNumber} - issued ${item.quantity} units`,
            createdBy: userId,
          },
        })

        await tx.inventoryBatch.update({
          where: { id: item.batchId },
          data: {
            currentQty: { decrement: item.quantity },
          },
        })
      }
    }

    // Update PO status
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'rm_issued_pending_goods' },
    })

    return issuance
  })
}
