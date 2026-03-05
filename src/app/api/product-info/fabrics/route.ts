import { NextRequest, NextResponse } from 'next/server'
import { FabricService } from '@/services/product-info-service'
import { createFabricSchema } from '@/validators/product-info'
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

    const fabrics = await FabricService.getAll(auth.user.tenantId, filters)
    return NextResponse.json({ fabrics })
  } catch (error) {
    console.error('Error fetching fabrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fabrics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = createFabricSchema.parse(body)

    const fabric = await FabricService.create(auth.user.tenantId, validatedData)
    return NextResponse.json({ fabric }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating fabric:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create fabric' },
      { status: 400 }
    )
  }
}
