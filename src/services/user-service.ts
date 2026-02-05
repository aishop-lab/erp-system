import { prisma } from '@/lib/prisma'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { CreateUserInput, UpdateUserInput } from '@/validators/user'
import { PermissionLevel } from '@/types/enums'

// Lazy-initialized admin client for creating users
let supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    }

    supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }
  return supabaseAdmin
}

// Generate secure random password
function generatePassword(length: number = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function getUsers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    include: { permissions: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { permissions: true },
  })
}

export async function getUserBySupabaseId(supabaseUserId: string) {
  return prisma.user.findUnique({
    where: { supabaseUserId },
    include: { permissions: true },
  })
}

export async function createUser(tenantId: string, data: CreateUserInput) {
  const password = generatePassword()

  // 1. Create user in Supabase Auth
  const admin = getSupabaseAdmin()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email,
    password: password,
    email_confirm: true,
  })

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`)
  }

  // 2. Create user in our database
  const user = await prisma.user.create({
    data: {
      tenantId,
      supabaseUserId: authData.user.id,
      email: data.email,
      name: data.name,
      isSuperAdmin: data.isSuperAdmin,
      permissions: data.permissions ? {
        create: data.permissions.map(p => ({
          module: p.module,
          subModule: p.subModule,
          permissionLevel: p.permission as PermissionLevel,
        }))
      } : undefined,
    },
    include: { permissions: true },
  })

  return { user, temporaryPassword: password }
}

export async function updateUser(id: string, data: UpdateUserInput) {
  // Update user basic info
  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.isSuperAdmin !== undefined) updateData.isSuperAdmin = data.isSuperAdmin

  // If permissions are provided, delete existing and create new
  if (data.permissions) {
    await prisma.userPermission.deleteMany({ where: { userId: id } })
    await prisma.userPermission.createMany({
      data: data.permissions.map(p => ({
        userId: id,
        module: p.module,
        subModule: p.subModule,
        permissionLevel: p.permission as PermissionLevel,
      }))
    })
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    include: { permissions: true },
  })
}

export async function deactivateUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
  })
}

export async function getUserPermissions(userId: string) {
  return prisma.userPermission.findMany({
    where: { userId },
  })
}

export async function checkPermission(
  userId: string,
  module: string,
  subModule: string | null = null,
  requiredLevel: PermissionLevel = PermissionLevel.VIEW
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permissions: true },
  })

  if (!user) return false
  if (user.isSuperAdmin) return true
  if (!user.isActive) return false

  const permission = user.permissions.find(
    p => p.module === module && p.subModule === subModule
  )

  if (!permission) return false

  const level = permission.permissionLevel
  if (level === 'none') return false
  if (requiredLevel === PermissionLevel.VIEW) {
    return level === 'view' || level === 'edit'
  }
  if (requiredLevel === PermissionLevel.EDIT) return level === 'edit'

  return false
}
