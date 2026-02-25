import { prisma } from '@/lib/prisma'
import type { CreateOutflowInput } from '@/validators/inventory'

export async function getOutflows(tenantId: string, params?: {
  outflowType?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}) {
  const { outflowType, startDate, endDate, page = 1, pageSize = 20 } = params || {}

  const where = {
    tenantId,
    ...(outflowType && { outflowType: outflowType as any }),
    ...(startDate && endDate && {
      outflowDate: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
    }),
  }

  const [outflows, total] = await Promise.all([
    prisma.inventoryOutflow.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventoryOutflow.count({ where }),
  ])

  return {
    data: outflows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

async function generateOutflowNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const prefix = `OUT-${year}${month}`

  const last = await prisma.inventoryOutflow.findFirst({
    where: { tenantId, outflowNumber: { startsWith: prefix } },
    orderBy: { outflowNumber: 'desc' },
  })

  let sequence = 1
  if (last?.outflowNumber) {
    const lastSeq = parseInt(last.outflowNumber.split('-').pop() || '0')
    sequence = lastSeq + 1
  }

  return `${prefix}-${sequence.toString().padStart(4, '0')}`
}

export async function createOutflow(
  tenantId: string,
  userId: string,
  userName: string,
  data: CreateOutflowInput
) {
  const outflowNumber = await generateOutflowNumber(tenantId)

  return prisma.$transaction(async (tx) => {
    // Create outflow header
    const outflow = await tx.inventoryOutflow.create({
      data: {
        tenantId,
        outflowNumber,
        outflowType: data.outflowType as any,
        recipientName: data.recipientName,
        recipientType: data.recipientType,
        outflowDate: new Date(data.outflowDate),
        notes: data.notes,
        status: 'completed',
        createdBy: userName,
        createdById: userId,
      },
    })

    let totalItems = 0
    let totalQuantity = 0

    for (const item of data.lineItems) {
      const batch = await tx.inventoryBatch.findUnique({
        where: { id: item.batchId },
      })

      if (!batch) {
        throw new Error(`Batch not found`)
      }

      if (Number(batch.currentQty) < item.quantity) {
        throw new Error(
          `Insufficient quantity in batch ${batch.batchNumber}: available ${Number(batch.currentQty)}, requested ${item.quantity}`
        )
      }

      // Create outflow item
      await tx.outflowItem.create({
        data: {
          outflowId: outflow.id,
          productId: batch.productId,
          productType: batch.productType,
          sku: batch.sku,
          productName: batch.sku,
          batchId: item.batchId,
          batchNumber: batch.batchNumber,
          quantity: item.quantity,
          reason: item.reason,
        },
      })

      // Decrement batch
      const newBatchBalance = Number(batch.currentQty) - item.quantity

      await tx.inventoryBatch.update({
        where: { id: item.batchId },
        data: { currentQty: { decrement: item.quantity } },
      })

      // Stock ledger
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
          batchId: item.batchId,
          batchNumber: batch.batchNumber,
          movementType: data.outflowType,
          referenceType: 'outflow',
          referenceId: outflow.id,
          referenceNumber: outflowNumber,
          qtyIn: 0,
          qtyOut: item.quantity,
          batchBalance: newBatchBalance,
          skuBalance: prevSkuBalance - item.quantity,
          notes: `${data.outflowType} outflow${data.recipientName ? ` to ${data.recipientName}` : ''}${item.reason ? `: ${item.reason}` : ''}`,
          createdBy: userId,
        },
      })

      totalItems++
      totalQuantity += item.quantity
    }

    // Update totals
    const updated = await tx.inventoryOutflow.update({
      where: { id: outflow.id },
      data: { totalItems, totalQuantity },
      include: {
        user: { select: { id: true, name: true } },
        items: true,
      },
    })

    return updated
  })
}
