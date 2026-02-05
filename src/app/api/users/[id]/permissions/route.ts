import { NextRequest, NextResponse } from 'next/server'
import { getUserPermissions } from '@/services/user-service'
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

    // Get the current user from our database using supabaseUserId
    const currentUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
      include: { permissions: true },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Users can only fetch their own permissions unless they are super admin
    if (id !== currentUser.id && !currentUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const permissions = await getUserPermissions(id === currentUser.id ? currentUser.id : id)

    return NextResponse.json({
      permissions: permissions.map(p => ({
        module: p.module,
        subModule: p.subModule,
        permissionLevel: p.permissionLevel,
      }))
    })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
