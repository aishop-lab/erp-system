import { NextRequest, NextResponse } from 'next/server'
import { PackagingService } from '@/services/product-info-service'
import { createPackagingSchema } from '@/validators/product-info'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const filters = {
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    }

    const packaging = await PackagingService.getAll(auth.user.tenantId, filters)
    return NextResponse.json({ packaging })
  } catch (error) {
    console.error('Error fetching packaging:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packaging' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = createPackagingSchema.parse(body)

    const packaging = await PackagingService.create(auth.user.tenantId, validatedData)
    return NextResponse.json({ packaging }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating packaging:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create packaging' },
      { status: 400 }
    )
  }
}
