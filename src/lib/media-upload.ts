import { createClient } from '@/lib/supabase/client'

export interface UploadResult {
  success: boolean
  filePath?: string
  publicUrl?: string
  error?: string
}

export interface FileValidation {
  valid: boolean
  error?: string
}

const BUCKET_NAME = 'product-media'
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime']

export class MediaUploader {
  private supabase = createClient()

  /**
   * Upload a single file to Supabase Storage
   */
  async uploadFile(file: File, folder: string = 'products'): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const extension = file.name.split('.').pop()?.toLowerCase()
      const fileName = `${timestamp}-${randomString}.${extension}`
      const filePath = `${folder}/${fileName}`

      // Upload file
      const { data, error } = await this.supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('Upload error:', error)
        return { success: false, error: error.message }
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      return {
        success: true,
        filePath: data.path,
        publicUrl: urlData.publicUrl,
      }
    } catch (error) {
      console.error('Upload exception:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath])

      if (error) {
        console.error('Delete error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Delete exception:', error)
      return false
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): FileValidation {
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    // Check file size
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: 'Image must be less than 5MB' }
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return { valid: false, error: 'Video must be less than 50MB' }
    }

    // Check file type
    if (isImage && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only JPG, PNG, and WEBP images are allowed' }
    }

    if (isVideo && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only MP4 and MOV videos are allowed' }
    }

    if (!isImage && !isVideo) {
      return { valid: false, error: 'File must be an image or video' }
    }

    return { valid: true }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(filePath: string): string {
    const { data } = this.supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  /**
   * Check if file is an image
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  /**
   * Check if file is a video
   */
  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/')
  }
}

export const mediaUploader = new MediaUploader()

/**
 * Get image dimensions from a File object
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }
    img.src = URL.createObjectURL(file)
  })
}
