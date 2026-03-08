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
  errorMessage: string | null
}

/**
 * Sync Amazon returns for a tenant using the Reports API.
 * Downloads return reports, parses them, and updates order statuses to 'returned'.
 */
export async function syncAmazonReturns(
  tenantId: string,
  daysBack = 90
): Promise<ReturnsSyncSummary> {
  const startedAt = new Date()
  let syncLogId = ''
  let recordsProcessed = 0
  let ordersUpdated = 0

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
      for (const row of fbaReturns) {
        const orderId = row['order-id'] || row['Order ID']
        if (orderId) returnedOrderIds.add(orderId)
      }
      console.log(`[Amazon Returns] FBA report: ${fbaReturns.length} return records, ${returnedOrderIds.size} unique orders`)
    } catch (err: any) {
      console.warn(`[Amazon Returns] FBA report failed (may not have data): ${err.message}`)
    }

    // 2. MFN Returns Report (seller-fulfilled)
    try {
      const mfnReturns = await downloadReturnReport(
        amazonClient,
        'GET_FLAT_FILE_RETURNS_DATA_BY_RETURN_DATE',
        startDate
      )
      for (const row of mfnReturns) {
        const orderId = row['Order ID'] || row['order-id']
        if (orderId) returnedOrderIds.add(orderId)
      }
      console.log(`[Amazon Returns] MFN report: ${mfnReturns.length} return records, total unique orders: ${returnedOrderIds.size}`)
    } catch (err: any) {
      console.warn(`[Amazon Returns] MFN report failed (may not have data): ${err.message}`)
    }

    recordsProcessed = returnedOrderIds.size

    if (returnedOrderIds.size === 0) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'completed',
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          completedAt: new Date(),
        },
      })
      return { syncLogId, status: 'completed', recordsProcessed: 0, ordersUpdated: 0, errorMessage: null }
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
          // Only update orders that aren't already returned/cancelled
          status: { in: ['delivered', 'shipped'] },
        },
        data: {
          status: 'returned',
        },
      })
      ordersUpdated += result.count
    }

    console.log(`[Amazon Returns] Updated ${ordersUpdated} orders to 'returned' status`)

    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: 'completed',
        recordsProcessed,
        recordsCreated: 0,
        recordsUpdated: ordersUpdated,
        completedAt: new Date(),
      },
    })

    return { syncLogId, status: 'completed', recordsProcessed, ordersUpdated, errorMessage: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Amazon Returns] Fatal error:`, errorMessage)

    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: { status: 'failed', errorMessage, completedAt: new Date(), recordsProcessed, recordsUpdated: ordersUpdated },
      })
    }

    return { syncLogId, status: 'failed', recordsProcessed, ordersUpdated, errorMessage }
  }
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

  // Step 2: Poll until report is ready (max 10 minutes)
  const MAX_POLL_TIME = 10 * 60 * 1000
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
