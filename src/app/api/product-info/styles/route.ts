import { NextRequest, NextResponse } from 'next/server'
import { StyleService } from '@/services/product-info-service'
import { createStyleSchema } from '@/validators/product-info'
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

    const styles = await StyleService.getAll(auth.user.tenantId, filters)
    return NextResponse.json({ styles })
  } catch (error) {
    console.error('Error fetching styles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch styles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const body = await request.json()
    const validatedData = createStyleSchema.parse(body)

    const style = await StyleService.create(auth.user.tenantId, validatedData)
    return NextResponse.json({ style }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating style:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create style' },
      { status: 400 }
    )
  }
}
