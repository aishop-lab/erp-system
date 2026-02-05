import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  isSuperAdmin: z.boolean().default(false),
  permissions: z.array(z.object({
    module: z.string(),
    subModule: z.string().nullable(),
    permission: z.enum(['none', 'view', 'edit']),
  })).optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  isActive: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional(),
  permissions: z.array(z.object({
    module: z.string(),
    subModule: z.string().nullable(),
    permission: z.enum(['none', 'view', 'edit']),
  })).optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
