'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Star, ImageIcon, Video, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { mediaUploader, getImageDimensions } from '@/lib/media-upload'

interface MediaFile {
  id: string
  filePath: string
  fileName: string
  fileType: string
  mimeType: string
  isPrimary: boolean
  sortOrder: number
}

interface MediaUploadProps {
  productId: string
  existingMedia?: MediaFile[]
  onMediaChange?: (media: MediaFile[]) => void
  maxImages?: number
  maxVideos?: number
}

export function MediaUpload({
  productId,
  existingMedia = [],
  onMediaChange,
  maxImages = 14,
  maxVideos = 1,
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [media, setMedia] = useState<MediaFile[]>(existingMedia)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMedia(existingMedia)
  }, [existingMedia])

  const imageCount = media.filter((m) => m.fileType === 'image').length
  const videoCount = media.filter((m) => m.fileType === 'video').length

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null)

      // Validate limits
      const newImages = acceptedFiles.filter((f) => f.type.startsWith('image/'))
      const newVideos = acceptedFiles.filter((f) => f.type.startsWith('video/'))

      if (imageCount + newImages.length > maxImages) {
        setError(`Maximum ${maxImages} images allowed`)
        return
      }

      if (videoCount + newVideos.length > maxVideos) {
        setError(`Maximum ${maxVideos} video allowed`)
        return
      }

      setUploading(true)
      const uploadingFileNames = acceptedFiles.map((f) => f.name)
      setUploadingFiles(uploadingFileNames)

      try {
        for (const file of acceptedFiles) {
          // Validate file
          const validation = mediaUploader.validateFile(file)
          if (!validation.valid) {
            setError(`${file.name}: ${validation.error}`)
            continue
          }

          // Upload to Supabase storage
          const result = await mediaUploader.uploadFile(
            file,
            `products/${productId}`
          )

          if (!result.success || !result.filePath) {
            setError(`Failed to upload ${file.name}: ${result.error}`)
            continue
          }

          // Get image dimensions if it's an image
          let width: number | undefined
          let height: number | undefined
          if (file.type.startsWith('image/')) {
            try {
              const dimensions = await getImageDimensions(file)
              width = dimensions.width
              height = dimensions.height
            } catch {
              // Ignore dimension errors
            }
          }

          // Save to database
          const response = await fetch(`/api/product-info/finished/${productId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath: result.filePath,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              fileType: file.type.startsWith('image/') ? 'image' : 'video',
              isPrimary: media.length === 0 && file.type.startsWith('image/'),
              width,
              height,
            }),
          })

          if (response.ok) {
            const { media: newMedia } = await response.json()
            setMedia((prev) => {
              const updated = [...prev, newMedia]
              onMediaChange?.(updated)
              return updated
            })
          } else {
            const errorData = await response.json()
            setError(`Failed to save ${file.name}: ${errorData.error}`)
          }

          // Remove from uploading list
          setUploadingFiles((prev) => prev.filter((n) => n !== file.name))
        }
      } catch (err) {
        console.error('Upload error:', err)
        setError('Upload failed. Please try again.')
      } finally {
        setUploading(false)
        setUploadingFiles([])
      }
    },
    [productId, media, imageCount, videoCount, maxImages, maxVideos, onMediaChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB max
    disabled: uploading,
  })

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Delete this file?')) return

    try {
      const response = await fetch(
        `/api/product-info/finished/${productId}/media/${mediaId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setMedia((prev) => {
          const updated = prev.filter((m) => m.id !== mediaId)
          onMediaChange?.(updated)
          return updated
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to delete. Please try again.')
    }
  }

  const handleSetPrimary = async (mediaId: string) => {
    try {
      const response = await fetch(
        `/api/product-info/finished/${productId}/media/${mediaId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPrimary: true }),
        }
      )

      if (response.ok) {
        setMedia((prev) => {
          const updated = prev.map((m) => ({
            ...m,
            isPrimary: m.id === mediaId,
          }))
          onMediaChange?.(updated)
          return updated
        })
      }
    } catch (err) {
      console.error('Set primary error:', err)
    }
  }

  const getPublicUrl = (filePath: string) => {
    return mediaUploader.getPublicUrl(filePath)
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          uploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">
              Uploading {uploadingFiles.join(', ')}...
            </p>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 text-primary mb-4" />
            <p className="text-sm text-primary font-medium">Drop files here...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground/75">
              Images: JPG, PNG, WEBP (max 5MB each)
              <br />
              Video: MP4, MOV (max 50MB)
            </p>
          </div>
        )}
      </div>

      {/* Media Counter */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <ImageIcon className="h-4 w-4" />
          Images: {imageCount}/{maxImages}
        </span>
        <span className="flex items-center gap-1">
          <Video className="h-4 w-4" />
          Videos: {videoCount}/{maxVideos}
        </span>
      </div>

      {/* Media Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {media.map((item) => (
            <div
              key={item.id}
              className="relative group aspect-square border rounded-lg overflow-hidden bg-muted"
            >
              {/* Media Preview */}
              {item.fileType === 'image' ? (
                <img
                  src={getPublicUrl(item.filePath)}
                  alt={item.fileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              {/* Primary Badge */}
              {item.isPrimary && (
                <div className="absolute top-1 left-1 bg-yellow-500 text-white px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-current" />
                </div>
              )}

              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                {!item.isPrimary && item.fileType === 'image' && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7"
                    onClick={() => handleSetPrimary(item.id)}
                    title="Set as primary"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7"
                  onClick={() => handleDelete(item.id)}
                  title="Delete"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {media.length === 0 && !uploading && (
        <div className="text-center py-6 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No media uploaded yet</p>
        </div>
      )}
    </div>
  )
}
