import { NextRequest, NextResponse } from 'next/server'
import { SupplierService } from '@/services/supplier-service'
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
    const purchaseType = searchParams.get('purchaseType')

    if (!purchaseType) {
      return NextResponse.json(
        { error: 'purchaseType is required' },
        { status: 400 }
      )
    }

    const suppliers = await SupplierService.getSuppliersByPurchaseType(
      currentUser.tenantId,
      purchaseType
    )

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Error fetching suppliers by purchase type:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}
