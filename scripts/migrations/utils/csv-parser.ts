import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'

export interface CSVRow {
  [key: string]: string
}

export async function parseCSV(filePath: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = []

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`  Parsed ${results.length} rows from ${path.basename(filePath)}`)
        resolve(results)
      })
      .on('error', reject)
  })
}

export function cleanValue(value: string | undefined | null): string | null {
  if (!value || value === '' || value === '_' || value === 'null' || value === 'undefined') {
    return null
  }
  return value.trim()
}

export function parseDecimal(value: string | undefined | null): number | null {
  const cleaned = cleanValue(value)
  if (!cleaned) return null
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

export function parseInteger(value: string | undefined | null): number | null {
  const cleaned = cleanValue(value)
  if (!cleaned) return null
  const parsed = Number.parseInt(cleaned, 10)
  return isNaN(parsed) ? null : parsed
}

// Convert GST from decimal (0.05) to percentage (5.0) if needed
export function normalizeGstRate(value: string | undefined | null): number {
  const rate = parseDecimal(value)
  if (rate === null) return 5.0
  // If rate is less than 1, it's in decimal form (0.05 = 5%)
  if (rate < 1) return rate * 100
  return rate
}
