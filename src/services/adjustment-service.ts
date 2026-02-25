import { prisma } from '@/lib/prisma'
import { AdjustmentType } from '@prisma/client'
import type { CreateAdjustmentInput } from '@/validators/inventory'

export async function getAdjustments(tenantId: string, params?: {
  page?: number
  pageSize?: number
}) {
  const { page = 1, pageSize = 20 } = params || {}

  const where = { tenantId }

  const [adjustments, total] = await Promise.all([
    prisma.stockAdjustment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        batch: { select: { batchNumber: true, currentQty: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockAdjustment.count({ where }),
  ])

  return {
    data: adjustments,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

async function generateAdjustmentNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const prefix = `ADJ-${year}${month}`

  const last = await prisma.stockAdjustment.findFirst({
    where: { tenantId, adjustmentNumber: { startsWith: prefix } },
    orderBy: { adjustmentNumber: 'desc' },
  })

  let sequence = 1
  if (last?.adjustmentNumber) {
    const lastSeq = parseInt(last.adjustmentNumber.split('-').pop() || '0')
    sequence = lastSeq + 1
  }

  return `${prefix}-${sequence.toString().padStart(4, '0')}`
}

export async function createAdjustment(
  tenantId: string,
  userId: string,
  userName: string,
  data: CreateAdjustmentInput
) {
  const batch = await prisma.inventoryBatch.findUnique({
    where: { id: data.batchId },
  })

  if (!batch) {
    throw new Error('Batch not found')
  }

  const systemQty = Number(batch.currentQty)
  const actualQty = data.actualQuantity
  const diff = actualQty - systemQty

  if (diff === 0) {
    throw new Error('Actual quantity matches system quantity — no adjustment needed')
  }

  const adjustmentType = diff > 0 ? AdjustmentType.addition : AdjustmentType.reduction
  const adjustmentNumber = await generateAdjustmentNumber(tenantId)

  return prisma.$transaction(async (tx) => {
    const adjustment = await tx.stockAdjustment.create({
      data: {
        tenantId,
        adjustmentNumber,
        adjustmentType,
        productId: batch.productId,
        productType: batch.productType,
        sku: batch.sku,
        productName: batch.sku,
        batchId: data.batchId,
        batchNumber: batch.batchNumber,
        systemQuantity: systemQty,
        actualQuantity: actualQty,
        adjustmentQuantity: Math.abs(diff),
        reason: data.reason,
        adjustmentDate: new Date(data.adjustmentDate),
        notes: data.notes,
        status: 'completed',
        createdBy: userName,
        createdById: userId,
      },
      include: {
        user: { select: { id: true, name: true } },
        batch: { select: { batchNumber: true, currentQty: true } },
      },
    })

    // Update batch to actual quantity
    await tx.inventoryBatch.update({
      where: { id: data.batchId },
      data: { currentQty: actualQty },
    })

    // Stock ledger
    const isIncrease = diff > 0
    const lastSkuEntry = batch.sku
      ? await tx.stockLedger.findFirst({
          where: { tenantId, sku: batch.sku },
          orderBy: { createdAt: 'desc' },
          select: { skuBalance: true },
        })
      : null
    const prevSkuBalance = lastSkuEntry ? Number(lastSkuEntry.skuBalance) : 0

    await tx.stockLedger.create({
      data: {
        tenantId,
        productId: batch.productId,
        productType: batch.productType,
        sku: batch.sku,
        batchId: data.batchId,
        batchNumber: batch.batchNumber,
        movementType: 'adjustment',
        referenceType: 'adjustment',
        referenceId: adjustment.id,
        referenceNumber: adjustmentNumber,
        qtyIn: isIncrease ? Math.abs(diff) : 0,
        qtyOut: isIncrease ? 0 : Math.abs(diff),
        batchBalance: actualQty,
        skuBalance: prevSkuBalance + diff,
        notes: `${isIncrease ? 'Increase' : 'Decrease'} adjustment: ${data.reason} (${systemQty} → ${actualQty})`,
        createdBy: userId,
      },
    })

    return adjustment
  })
}
