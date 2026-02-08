import { NextRequest, NextResponse } from 'next/server'
import { PackagingService } from '@/services/product-info-service'
import { updatePackagingSchema } from '@/validators/product-info'
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

    const packaging = await PackagingService.getById(id, currentUser.tenantId)
    if (!packaging) {
      return NextResponse.json({ error: 'Packaging not found' }, { status: 404 })
    }

    return NextResponse.json({ packaging })
  } catch (error) {
    console.error('Error fetching packaging:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packaging' },
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
    const validatedData = updatePackagingSchema.parse(body)

    const packaging = await PackagingService.update(id, currentUser.tenantId, validatedData)
    return NextResponse.json({ packaging })
  } catch (error: any) {
    console.error('Error updating packaging:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update packaging' },
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

    await PackagingService.deactivate(id, currentUser.tenantId)
    return NextResponse.json({ message: 'Packaging deactivated' })
  } catch (error: any) {
    console.error('Error deactivating packaging:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate packaging' },
      { status: 400 }
    )
  }
}
