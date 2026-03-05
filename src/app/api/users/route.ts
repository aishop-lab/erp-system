import { NextRequest, NextResponse } from 'next/server'
import { getUsers, createUser } from '@/services/user-service'
import { createUserSchema } from '@/validators/user'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const users = await getUsers(auth.user.tenantId)
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    if (!auth.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    const { user, temporaryPassword } = await createUser(auth.user.tenantId, validatedData)

    return NextResponse.json({
      user,
      temporaryPassword,
      message: 'User created successfully. Share the temporary password securely.'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
