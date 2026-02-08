import { NextRequest, NextResponse } from 'next/server'
import { PackagingService } from '@/services/product-info-service'
import { createPackagingSchema } from '@/validators/product-info'
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

    const packaging = await PackagingService.getAll(currentUser.tenantId, filters)
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
    const validatedData = createPackagingSchema.parse(body)

    const packaging = await PackagingService.create(currentUser.tenantId, validatedData)
    return NextResponse.json({ packaging }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating packaging:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create packaging' },
      { status: 400 }
    )
  }
}
