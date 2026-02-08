import { NextRequest, NextResponse } from 'next/server'
import { RawMaterialService } from '@/services/product-info-service'
import { updateRawMaterialSchema } from '@/validators/product-info'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const rawMaterial = await RawMaterialService.getById(id, currentUser.tenantId)
    if (!rawMaterial) {
      return NextResponse.json({ error: 'Raw material not found' }, { status: 404 })
    }

    return NextResponse.json({ rawMaterial })
  } catch (error) {
    console.error('Error fetching raw material:', error)
    return NextResponse.json(
      { error: 'Failed to fetch raw material' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const validatedData = updateRawMaterialSchema.parse(body)

    const rawMaterial = await RawMaterialService.update(id, currentUser.tenantId, validatedData)
    return NextResponse.json({ rawMaterial })
  } catch (error: any) {
    console.error('Error updating raw material:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update raw material' },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    await RawMaterialService.deactivate(id, currentUser.tenantId)
    return NextResponse.json({ message: 'Raw material deactivated' })
  } catch (error: any) {
    console.error('Error deactivating raw material:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate raw material' },
      { status: 400 }
    )
  }
}
