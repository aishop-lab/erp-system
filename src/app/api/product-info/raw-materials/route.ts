import { NextRequest, NextResponse } from 'next/server'
import { RawMaterialService } from '@/services/product-info-service'
import { createRawMaterialSchema } from '@/validators/product-info'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    }

    const rawMaterials = await RawMaterialService.getAll(currentUser.tenantId, filters)
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
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = createRawMaterialSchema.parse(body)

    const rawMaterial = await RawMaterialService.create(currentUser.tenantId, validatedData)
    return NextResponse.json({ rawMaterial }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating raw material:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create raw material' },
      { status: 400 }
    )
  }
}
