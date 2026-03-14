import { prisma } from '@/lib/prisma'
import {
  getAmazonClientForTenant,
  getAmazonPlatformId,
  withRateLimitRetry,
  AMAZON_IN_MARKETPLACE_ID,
} from './client'

export interface ReturnsSyncSummary {
  syncLogId: string
  status: string
  recordsProcessed: number
  ordersUpdated: number
  returnsUpserted: number
  errorMessage: string | null
}

/**
 * Sync Amazon returns for a tenant using the Reports API.
 * Downloads return reports, parses them, stores detailed return records,
 * and updates order statuses to 'returned'.
 */
export async function syncAmazonReturns(
  tenantId: string,
  daysBack = 90
): Promise<ReturnsSyncSummary> {
  const startedAt = new Date()
  const syncStartTime = Date.now()
  let syncLogId = ''
  let recordsProcessed = 0
  let ordersUpdated = 0
  let returnsUpserted = 0

  try {
    const platformId = await getAmazonPlatformId(tenantId)
    const amazonClient = await getAmazonClientForTenant(tenantId)

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        tenantId,
        platformId,
        syncType: 'amazon_returns',
        status: 'running',
        startedAt,
      },
    })
    syncLogId = syncLog.id

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    // Collect returned order IDs from both FBA and MFN reports
    const returnedOrderIds = new Set<string>()

    // 1. FBA Returns Report
    try {
      const fbaReturns = await downloadReturnReport(
        amazonClient,
        'GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA',
        startDate
      )
      const upsertedFba = await upsertReturnRecords(tenantId, platformId, fbaReturns, 'fba')
      returnsUpserted += upsertedFba
      for (const row of fbaReturns) {
        const orderId = row['order-id'] || row['Order ID']
        if (orderId) returnedOrderIds.add(orderId)
      }
      console.log(`[Amazon Returns] FBA report: ${fbaReturns.length} rows, ${upsertedFba} upserted, ${returnedOrderIds.size} unique orders`)
    } catch (err: any) {
      console.warn(`[Amazon Returns] FBA report failed (may not have data): ${err.message}`)
    }

    // 2. MFN Returns Report (seller-fulfilled)
    // Fix #6: Check remaining time before starting second report
    const elapsedMs = Date.now() - syncStartTime
    const remainingMs = (5 * 60 * 1000) - elapsedMs // 5-min maxDuration budget
    if (remainingMs < 60 * 1000) {
      console.warn(`[Amazon Returns] Skipping MFN report — only ${Math.round(remainingMs / 1000)}s remaining (need at least 60s)`)
    } else {
      try {
        const mfnReturns = await downloadReturnReport(
          amazonClient,
          'GET_FLAT_FILE_RETURNS_DATA_BY_RETURN_DATE',
          startDate
        )
        const upsertedMfn = await upsertReturnRecords(tenantId, platformId, mfnReturns, 'mfn')
        returnsUpserted += upsertedMfn
        for (const row of mfnReturns) {
          const orderId = row['Order ID'] || row['order-id']
          if (orderId) returnedOrderIds.add(orderId)
        }
        console.log(`[Amazon Returns] MFN report: ${mfnReturns.length} rows, ${upsertedMfn} upserted, total unique orders: ${returnedOrderIds.size}`)
      } catch (err: any) {
        console.warn(`[Amazon Returns] MFN report failed (may not have data): ${err.message}`)
      }
    }

    recordsProcessed = returnedOrderIds.size

    if (returnedOrderIds.size === 0) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'completed',
          recordsProcessed: 0,
          recordsCreated: returnsUpserted,
          recordsUpdated: 0,
          completedAt: new Date(),
        },
      })
      return { syncLogId, status: 'completed', recordsProcessed: 0, ordersUpdated: 0, returnsUpserted, errorMessage: null }
    }

    // Update order statuses in batches
    const orderIdArray = Array.from(returnedOrderIds)
    const BATCH_SIZE = 100

    for (let i = 0; i < orderIdArray.length; i += BATCH_SIZE) {
      const batch = orderIdArray.slice(i, i + BATCH_SIZE)
      const result = await prisma.salesOrder.updateMany({
        where: {
          tenantId,
          platformId,
          externalOrderId: { in: batch },
          // Fix #16: Include all non-terminal statuses that should transition to 'returned'
          status: { in: ['delivered', 'shipped', 'confirmed', 'processing'] },
        },
        data: {
          status: 'returned',
        },
      })
      ordersUpdated += result.count
    }

    console.log(`[Amazon Returns] Updated ${ordersUpdated} orders to 'returned' status, ${returnsUpserted} return records upserted`)

    // Fix #2: Backfill refundAmount — divide order total by number of return records per order
    // to avoid inflating refund totals when an order has multiple returned items
    try {
      await prisma.$executeRaw`
        UPDATE amazon_returns ar
        SET "refundAmount" = (so."totalAmount"::numeric / GREATEST(rc.cnt, 1))
        FROM sales_orders so
        JOIN (
          SELECT "orderId", COUNT(*)::int as cnt
          FROM amazon_returns
          WHERE "tenantId" = ${tenantId} AND "refundAmount" IS NULL AND "orderId" IS NOT NULL
          GROUP BY "orderId"
        ) rc ON rc."orderId" = ar."orderId"
        WHERE ar."orderId" = so.id
          AND ar."tenantId" = ${tenantId}
          AND ar."refundAmount" IS NULL
          AND so."totalAmount" IS NOT NULL
      `
      console.log(`[Amazon Returns] Backfilled refundAmount from linked orders (divided by return count per order)`)
    } catch (err: any) {
      console.warn(`[Amazon Returns] refundAmount backfill failed: ${err.message}`)
    }

    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: 'completed',
        recordsProcessed,
        recordsCreated: returnsUpserted,
        recordsUpdated: ordersUpdated,
        completedAt: new Date(),
      },
    })

    return { syncLogId, status: 'completed', recordsProcessed, ordersUpdated, returnsUpserted, errorMessage: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Amazon Returns] Fatal error:`, errorMessage)

    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: { status: 'failed', errorMessage, completedAt: new Date(), recordsProcessed, recordsUpdated: ordersUpdated },
      })
    }

    return { syncLogId, status: 'failed', recordsProcessed, ordersUpdated, returnsUpserted, errorMessage }
  }
}

/**
 * Parse return report rows and upsert into AmazonReturn table.
 */
async function upsertReturnRecords(
  tenantId: string,
  platformId: string,
  rows: Record<string, string>[],
  returnType: 'fba' | 'mfn'
): Promise<number> {
  let upserted = 0
  const BATCH_SIZE = 50

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const operations = batch.map(row => {
      const externalOrderId = row['order-id'] || row['Order ID'] || ''
      if (!externalOrderId) return null

      const sku = row['sku'] || row['SKU'] || null
      const asin = row['asin'] || row['ASIN'] || null
      const returnDateStr = row['return-date'] || row['Return request date'] || null
      const returnDate = returnDateStr ? new Date(returnDateStr) : null
      const validReturnDate = returnDate && !isNaN(returnDate.getTime()) ? returnDate : null

      // Try to get item-level refund amount from report
      const refundStr = row['Refund amount'] || row['refund-amount'] || null
      // Also try item price as a better per-item refund proxy than order total
      const itemPriceStr = row['item-price'] || row['Item price'] || null
      const refundAmount = refundStr ? parseFloat(refundStr) : (itemPriceStr ? parseFloat(itemPriceStr) : null)

      const data = {
        tenantId,
        platformId,
        externalOrderId,
        sku,
        asin,
        fnsku: row['fnsku'] || row['FNSKU'] || null,
        productName: row['product-name'] || row['Product name'] || row['product_name'] || null,
        quantity: parseInt(row['quantity'] || row['Quantity'] || '1', 10) || 1,
        returnDate: validReturnDate,
        returnReason: row['reason'] || row['Return reason'] || null,
        disposition: row['detailed-disposition'] || row['disposition'] || null,
        customerComments: row['customer-comments'] || row['Customer comments'] || null,
        fulfillmentCenterId: row['fulfillment-center-id'] || row['Fulfillment center ID'] || null,
        returnType,
        resolution: row['Resolution'] || row['resolution'] || null,
        refundAmount: refundAmount !== null && !isNaN(refundAmount) ? refundAmount : null,
        status: row['status'] || row['Status'] || row['Return request status'] || null,
      }

      return prisma.amazonReturn.upsert({
        where: {
          tenantId_externalOrderId_sku_returnDate: {
            tenantId,
            externalOrderId,
            sku: data.sku || '',
            returnDate: data.returnDate || new Date(0),
          },
        },
        create: data,
        update: {
          returnReason: data.returnReason,
          disposition: data.disposition,
          customerComments: data.customerComments,
          resolution: data.resolution,
          // Only set refundAmount if the report provides one; don't overwrite a previously backfilled value
          ...(data.refundAmount !== null ? { refundAmount: data.refundAmount } : {}),
          status: data.status,
          quantity: data.quantity,
        },
      })
    }).filter(Boolean)

    const results = await Promise.allSettled(operations as Promise<any>[])
    upserted += results.filter(r => r.status === 'fulfilled').length
  }

  // Link return records to SalesOrder IDs where possible
  await prisma.$executeRaw`
    UPDATE amazon_returns ar
    SET "orderId" = so.id
    FROM sales_orders so
    WHERE ar."tenantId" = ${tenantId}
      AND ar."orderId" IS NULL
      AND so."tenantId" = ${tenantId}
      AND so."externalOrderId" = ar."externalOrderId"
  `

  return upserted
}

/**
 * Download and parse a return report from Amazon SP-API.
 * Uses the 3-step process: createReport → poll → download.
 */
async function downloadReturnReport(
  client: any,
  reportType: string,
  startDate: Date
): Promise<Record<string, string>[]> {
  // Step 1: Create report request
  const createRes: any = await withRateLimitRetry(() =>
    client.callAPI({
      operation: 'reports.createReport',
      body: {
        reportType,
        marketplaceIds: [AMAZON_IN_MARKETPLACE_ID],
        dataStartTime: startDate.toISOString(),
      },
    })
  )

  const reportId = createRes?.reportId ?? createRes?.ReportId
  if (!reportId) {
    throw new Error(`Failed to create report ${reportType}: no reportId returned`)
  }

  console.log(`[Amazon Returns] Created report ${reportType}, id: ${reportId}`)

  // Fix #6: Reduced polling timeout from 10 min to 2 min to fit within 5-min maxDuration
  const MAX_POLL_TIME = 2 * 60 * 1000
  const POLL_INTERVAL = 15 * 1000
  const pollStart = Date.now()
  let reportDocumentId: string | null = null

  while (Date.now() - pollStart < MAX_POLL_TIME) {
    const reportStatus: any = await withRateLimitRetry(() =>
      client.callAPI({
        operation: 'reports.getReport',
        path: { reportId },
      })
    )

    const status = reportStatus?.processingStatus ?? reportStatus?.ProcessingStatus
    console.log(`[Amazon Returns] Report ${reportId} status: ${status}`)

    if (status === 'DONE') {
      reportDocumentId = reportStatus?.reportDocumentId ?? reportStatus?.ReportDocumentId
      break
    }

    if (status === 'CANCELLED' || status === 'FATAL') {
      throw new Error(`Report ${reportType} failed with status: ${status}`)
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL))
  }

  if (!reportDocumentId) {
    throw new Error(`Report ${reportType} timed out after ${MAX_POLL_TIME / 1000}s`)
  }

  // Step 3: Get report document URL and download
  const docInfo: any = await withRateLimitRetry(() =>
    client.callAPI({
      operation: 'reports.getReportDocument',
      path: { reportDocumentId },
    })
  )

  const downloadUrl = docInfo?.url ?? docInfo?.Url
  if (!downloadUrl) {
    throw new Error(`No download URL for report document ${reportDocumentId}`)
  }

  const response = await fetch(downloadUrl)
  if (!response.ok) {
    throw new Error(`Failed to download report: ${response.status} ${response.statusText}`)
  }

  const text = await response.text()
  return parseTsv(text)
}

/**
 * Parse tab-separated report data into an array of key-value objects.
 */
function parseTsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split('\t').map(h => h.trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t')
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] || '').trim()
    }
    rows.push(row)
  }

  return rows
}
