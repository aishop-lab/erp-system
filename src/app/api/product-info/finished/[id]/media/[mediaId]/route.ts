import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/api-auth'

// GET /api/product-info/finished/[id]/media/[mediaId] - Get single media
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const { id, mediaId } = await params
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    const media = await prisma.mediaFile.findFirst({
      where: {
        id: mediaId,
        entityId: id,
        tenantId: auth.user.tenantId,
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
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    // Verify media exists
    const existingMedia = await prisma.mediaFile.findFirst({
      where: {
        id: mediaId,
        entityId: id,
        tenantId: auth.user.tenantId,
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
          tenantId: auth.user.tenantId,
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
    const auth = await authenticateRequest()
    if (auth.response) return auth.response

    // Get media file
    const media = await prisma.mediaFile.findFirst({
      where: {
        id: mediaId,
        entityId: id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Delete from Supabase storage
    const supabase = await createClient()
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
