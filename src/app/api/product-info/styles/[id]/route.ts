import { NextRequest, NextResponse } from 'next/server'
import { StyleService } from '@/services/product-info-service'
import { updateStyleSchema } from '@/validators/product-info'
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

    const style = await StyleService.getById(id, currentUser.tenantId)
    if (!style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    return NextResponse.json({ style })
  } catch (error) {
    console.error('Error fetching style:', error)
    return NextResponse.json(
      { error: 'Failed to fetch style' },
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
    const validatedData = updateStyleSchema.parse(body)

    const style = await StyleService.update(id, currentUser.tenantId, validatedData)
    return NextResponse.json({ style })
  } catch (error: any) {
    console.error('Error updating style:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update style' },
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

    await StyleService.deactivate(id, currentUser.tenantId)
    return NextResponse.json({ message: 'Style deactivated' })
  } catch (error: any) {
    console.error('Error deactivating style:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate style' },
      { status: 400 }
    )
  }
}
