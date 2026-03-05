import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUser, deactivateUser, getUserPermissions } from '@/services/user-service'
import { updateUserSchema } from '@/validators/user'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const user = await getUserById(id)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.tenantId !== auth.user.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    // Verify target user belongs to same tenant
    const targetUser = await getUserById(id)
    if (!targetUser || targetUser.tenantId !== auth.user.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    const user = await updateUser(id, validatedData)

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Error updating user:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    // Don't allow deleting yourself
    if (id === auth.user.id) {
      return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 })
    }

    // Verify target user belongs to same tenant
    const targetUser = await getUserById(id)
    if (!targetUser || targetUser.tenantId !== auth.user.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Soft delete (deactivate)
    const user = await deactivateUser(id)

    return NextResponse.json({ message: 'User deactivated', user })
  } catch (error) {
    console.error('Error deactivating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
