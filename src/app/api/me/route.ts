import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First try to find by supabaseUserId
    let currentUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
      include: { permissions: true },
    })

    // If not found, try to find by email and link the accounts
    if (!currentUser && authUser.email) {
      currentUser = await prisma.user.findUnique({
        where: { email: authUser.email },
        include: { permissions: true },
      })

      // If found by email, update the supabaseUserId to link accounts
      if (currentUser) {
        currentUser = await prisma.user.update({
          where: { id: currentUser.id },
          data: { supabaseUserId: authUser.id },
          include: { permissions: true },
        })
      }
    }

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      tenantId: currentUser.tenantId,
      role: currentUser.role,
      isSuperAdmin: currentUser.isSuperAdmin,
      isActive: currentUser.isActive,
      permissions: currentUser.permissions.map(p => ({
        module: p.module,
        subModule: p.subModule,
        permissionLevel: p.permissionLevel,
      })),
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
