import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const mediaSchema = z.object({
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  mimeType: z.string().min(1),
  fileType: z.enum(['image', 'video']),
  isPrimary: z.boolean().default(false),
  width: z.number().optional(),
  height: z.number().optional(),
})

// GET /api/product-info/finished/[id]/media - List all media for a product
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

    const currentUser = await prisma.user.findUnique({
      where: { supabaseUserId: authUser.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const media = await prisma.mediaFile.findMany({
      where: {
        entityType: 'finished_product',
        entityId: id,
        tenantId: currentUser.tenantId,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}

// POST /api/product-info/finished/[id]/media - Add new media
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

    const body = await request.json()
    const validatedData = mediaSchema.parse(body)

    // Verify product exists and belongs to user's tenant
    const product = await prisma.finishedProduct.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check media limits
    const existingMedia = await prisma.mediaFile.findMany({
      where: {
        entityType: 'finished_product',
        entityId: id,
        tenantId: currentUser.tenantId,
      },
    })

    const imageCount = existingMedia.filter((m) => m.fileType === 'image').length
    const videoCount = existingMedia.filter((m) => m.fileType === 'video').length

    if (validatedData.fileType === 'image' && imageCount >= 14) {
      return NextResponse.json(
        { error: 'Maximum 14 images allowed per product' },
        { status: 400 }
      )
    }

    if (validatedData.fileType === 'video' && videoCount >= 1) {
      return NextResponse.json(
        { error: 'Maximum 1 video allowed per product' },
        { status: 400 }
      )
    }

    // If setting as primary, unset other primary images
    if (validatedData.isPrimary) {
      await prisma.mediaFile.updateMany({
        where: {
          entityType: 'finished_product',
          entityId: id,
          tenantId: currentUser.tenantId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      })
    }

    // Get next sort order
    const maxSortOrder = existingMedia.length > 0
      ? Math.max(...existingMedia.map((m) => m.sortOrder))
      : -1

    // Create media record
    const media = await prisma.mediaFile.create({
      data: {
        tenantId: currentUser.tenantId,
        entityType: 'finished_product',
        entityId: id,
        filePath: validatedData.filePath,
        fileName: validatedData.fileName,
        fileSize: validatedData.fileSize,
        mimeType: validatedData.mimeType,
        fileType: validatedData.fileType,
        isPrimary: validatedData.isPrimary,
        width: validatedData.width,
        height: validatedData.height,
        sortOrder: maxSortOrder + 1,
      },
    })

    return NextResponse.json({ media }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating media:', error)
    return NextResponse.json(
      { error: 'Failed to create media' },
      { status: 500 }
    )
  }
}
