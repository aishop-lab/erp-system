import { NextRequest, NextResponse } from 'next/server'
import { FabricService } from '@/services/product-info-service'
import { updateFabricSchema } from '@/validators/product-info'
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

    const fabric = await FabricService.getById(id, currentUser.tenantId)
    if (!fabric) {
      return NextResponse.json({ error: 'Fabric not found' }, { status: 404 })
    }

    return NextResponse.json({ fabric })
  } catch (error) {
    console.error('Error fetching fabric:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fabric' },
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
    const validatedData = updateFabricSchema.parse(body)

    const fabric = await FabricService.update(id, currentUser.tenantId, validatedData)
    return NextResponse.json({ fabric })
  } catch (error: any) {
    console.error('Error updating fabric:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update fabric' },
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

    await FabricService.deactivate(id, currentUser.tenantId)
    return NextResponse.json({ message: 'Fabric deactivated' })
  } catch (error: any) {
    console.error('Error deactivating fabric:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate fabric' },
      { status: 400 }
    )
  }
}
