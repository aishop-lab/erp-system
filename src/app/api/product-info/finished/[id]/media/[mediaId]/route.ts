import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/product-info/finished/[id]/media/[mediaId] - Get single media
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const { id, mediaId } = await params
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

    const media = await prisma.mediaFile.findFirst({
      where: {
        id: mediaId,
        entityId: id,
        tenantId: currentUser.tenantId,
      },
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}

// PATCH /api/product-info/finished/[id]/media/[mediaId] - Update media (set primary, reorder)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const { id, mediaId } = await params
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

    // Verify media exists
    const existingMedia = await prisma.mediaFile.findFirst({
      where: {
        id: mediaId,
        entityId: id,
        tenantId: currentUser.tenantId,
      },
    })

    if (!existingMedia) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    const body = await request.json()
    const { isPrimary, sortOrder } = body

    // If setting as primary, unset other primary images
    if (isPrimary === true) {
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

    // Update media
    const media = await prisma.mediaFile.update({
      where: {
        id: mediaId,
      },
      data: {
        ...(isPrimary !== undefined && { isPrimary }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Error updating media:', error)
    return NextResponse.json(
      { error: 'Failed to update media' },
      { status: 500 }
    )
  }
}

// DELETE /api/product-info/finished/[id]/media/[mediaId] - Delete media
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const { id, mediaId } = await params
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

    // Get media file
    const media = await prisma.mediaFile.findFirst({
      where: {
        id: mediaId,
        entityId: id,
        tenantId: currentUser.tenantId,
      },
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Delete from Supabase storage
    const { error: storageError } = await supabase.storage
      .from('product-media')
      .remove([media.filePath])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    await prisma.mediaFile.delete({
      where: { id: mediaId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting media:', error)
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    )
  }
}
