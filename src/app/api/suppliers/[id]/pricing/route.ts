import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { uploadPricingSchema, csvPricingRowSchema } from '@/validators/supplier'
import { authenticateRequest } from '@/lib/api-auth'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const pricing = await SupplierService.getPricing(id, auth.user.tenantId)
    return NextResponse.json(pricing)
  } catch (error: any) {
    console.error('Error fetching pricing:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pricing' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()

    // Check if it's CSV format (by SKU) or direct format (by productId)
    if (body.csvPricing) {
      // CSV format: [{sku, unitPrice, currency?, minQty?}]
      const csvSchema = z.array(csvPricingRowSchema)
      const validatedData = csvSchema.parse(body.csvPricing)

      const { results, errors } = await SupplierService.uploadPricingFromCsv(
        id,
        validatedData,
        auth.user.tenantId
      )

      return NextResponse.json({
        message: 'Pricing catalog uploaded',
        count: results.length,
        errors: errors.length > 0 ? errors : undefined,
      })
    } else {
      // Direct format: [{productId, unitPrice, currency?, minQty?, validFrom?, validTo?}]
      const validatedData = uploadPricingSchema.parse(body)

      const results = await SupplierService.uploadPricingCatalog(
        id,
        validatedData.pricing,
        auth.user.tenantId
      )

      return NextResponse.json({
        message: 'Pricing catalog uploaded',
        count: results.length,
      })
    }
  } catch (error: any) {
    console.error('Error uploading pricing:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to upload pricing' },
      { status: 400 }
    )
  }
}
