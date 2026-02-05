import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(
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

    const supplier = await SupplierService.activateSupplier(id, currentUser.tenantId)
    return NextResponse.json(supplier)
  } catch (error: any) {
    console.error('Error activating supplier:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to activate supplier' },
      { status: 400 }
    )
  }
}
