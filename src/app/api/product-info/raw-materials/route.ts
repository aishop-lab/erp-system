import { NextRequest, NextResponse } from 'next/server'
import { RawMaterialService } from '@/services/product-info-service'
import { createRawMaterialSchema } from '@/validators/product-info'
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

    const rawMaterials = await RawMaterialService.getAll(auth.user.tenantId, filters)
    return NextResponse.json({ rawMaterials })
  } catch (error) {
    console.error('Error fetching raw materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch raw materials' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = createRawMaterialSchema.parse(body)

    const rawMaterial = await RawMaterialService.create(auth.user.tenantId, validatedData)
    return NextResponse.json({ rawMaterial }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating raw material:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create raw material' },
      { status: 400 }
    )
  }
}
