/**
 * Import Amazon Business Reports data from "Custom Analytics Metric Data.xlsx"
 * into the amazon_business_metrics table.
 *
 * Usage: npx tsx scripts/import-business-metrics.ts
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

const TENANT_ID = process.env.TENANT_ID || 'cml3m3z9q0000hctvj38flpyb'
const FILE_PATH = process.env.FILE_PATH || 'Custom Analytics Metric Data.xlsx'

async function main() {
  // Dynamic import for openpyxl alternative - use xlsx-parse-json or raw XML parsing
  // Since xlsx npm isn't installed, we'll parse the XML inside the xlsx (zip) file
  const rows = await parseXlsx(FILE_PATH)

  console.log(`Parsed ${rows.length} rows from ${FILE_PATH}`)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    if (!row.asin) {
      skipped++
      continue
    }

    try {
      await prisma.amazonBusinessMetric.upsert({
        where: {
          tenantId_asin: { tenantId: TENANT_ID, asin: row.asin },
        },
        create: {
          tenantId: TENANT_ID,
          asin: row.asin,
          itemName: row.itemName,
          glanceViews: row.glanceViews,
          conversionRate: row.conversionRate,
          unitsShipped: row.unitsShipped,
          avgSellingPrice: row.avgSellingPrice,
          salesAmount: row.salesAmount,
          availableInventory: row.availableInventory,
          reportDate: new Date(),
        },
        update: {
          itemName: row.itemName,
          glanceViews: row.glanceViews,
          conversionRate: row.conversionRate,
          unitsShipped: row.unitsShipped,
          avgSellingPrice: row.avgSellingPrice,
          salesAmount: row.salesAmount,
          availableInventory: row.availableInventory,
          reportDate: new Date(),
        },
      })
      created++
    } catch (err: any) {
      console.error(`Error upserting ASIN ${row.asin}:`, err.message)
      skipped++
    }
  }

  console.log(`\nDone! Created/updated: ${created}, Skipped: ${skipped}`)
}

interface MetricRow {
  asin: string
  itemName: string | null
  glanceViews: number
  conversionRate: number
  unitsShipped: number
  avgSellingPrice: number
  salesAmount: number
  availableInventory: number
}

async function parseXlsx(filePath: string): Promise<MetricRow[]> {
  // Use child_process to call python since xlsx npm isn't installed
  const { execSync } = require('child_process')

  const pythonScript = `
import openpyxl, json, re, sys

wb = openpyxl.load_workbook('${filePath}')
ws = wb['metric-data']

rows = []
for row in ws.iter_rows(min_row=3, values_only=True):
    asin_val = row[0]
    if asin_val is None:
        continue

    # Extract ASIN from hyperlink formula
    asin = str(asin_val)
    m = re.search(r'B0[A-Z0-9]+', asin)
    if not m:
        continue
    asin = m.group()

    # Extract item name from hyperlink formula
    name_val = row[1]
    item_name = None
    if name_val:
        name_str = str(name_val)
        # Try to extract from HYPERLINK formula: =HYPERLINK("url", "display text")
        nm = re.search(r',\\s*"([^"]+)"\\s*\\)', name_str)
        if nm:
            item_name = nm.group(1)
        elif not name_str.startswith('='):
            item_name = name_str

    rows.append({
        'asin': asin,
        'itemName': item_name,
        'glanceViews': int(row[2] or 0),
        'conversionRate': float(row[3] or 0),
        'unitsShipped': int(row[4] or 0),
        'avgSellingPrice': float(row[5] or 0),
        'salesAmount': float(row[6] or 0),
        'availableInventory': int(row[7] or 0),
    })

json.dump(rows, sys.stdout)
`

  const result = execSync(`python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  })

  return JSON.parse(result)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
