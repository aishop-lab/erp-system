import { NextRequest, NextResponse } from 'next/server'
import { FinishedProductService } from '@/services/product-info-service'
import { createFinishedProductSchema } from '@/validators/product-info'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const filters = {
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      styleId: searchParams.get('styleId') || undefined,
      fabricId: searchParams.get('fabricId') || undefined,
    }

    const products = await FinishedProductService.getAll(auth.user.tenantId, filters)
    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching finished products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch finished products' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = createFinishedProductSchema.parse(body)

    const product = await FinishedProductService.create(auth.user.tenantId, validatedData)
    return NextResponse.json({ product }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating finished product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create finished product' },
      { status: 400 }
    )
  }
}
