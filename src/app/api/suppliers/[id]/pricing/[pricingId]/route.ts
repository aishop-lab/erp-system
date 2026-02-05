import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pricingId: string }> }
) {
  try {
    const { pricingId } = await params
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

    await SupplierService.deletePricing(pricingId, currentUser.tenantId)
    return NextResponse.json({ message: 'Pricing deleted' })
  } catch (error: any) {
    console.error('Error deleting pricing:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete pricing' },
      { status: 400 }
    )
  }
}
