import { NextRequest, NextResponse } from 'next/server'
import { getUserPermissions } from '@/services/user-service'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    // Users can only fetch their own permissions unless they are super admin
    if (id !== auth.user.id && !auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const permissions = await getUserPermissions(id === auth.user.id ? auth.user.id : id)

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
