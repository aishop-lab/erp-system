import { NextRequest, NextResponse } from 'next/server'
import { FinishedProductService } from '@/services/product-info-service'
import { updateFinishedProductSchema } from '@/validators/product-info'
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

    const product = await FinishedProductService.getById(id, currentUser.tenantId)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error fetching finished product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch finished product' },
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
    const validatedData = updateFinishedProductSchema.parse(body)

    const product = await FinishedProductService.update(id, currentUser.tenantId, validatedData)
    return NextResponse.json({ product })
  } catch (error: any) {
    console.error('Error updating finished product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update finished product' },
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

    await FinishedProductService.deactivate(id, currentUser.tenantId)
    return NextResponse.json({ message: 'Product deactivated' })
  } catch (error: any) {
    console.error('Error deactivating finished product:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate finished product' },
      { status: 400 }
    )
  }
}
