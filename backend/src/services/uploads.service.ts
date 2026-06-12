import { v2 as cloudinary } from 'cloudinary'

// The Cloudinary SDK reads CLOUDINARY_URL from the environment on its own; we
// only force https URLs. Uploads respond 503 when it is not configured, while
// the rest of the platform keeps working.

export function isCloudinaryEnabled(): boolean {
  return Boolean(process.env.CLOUDINARY_URL)
}

export interface UploadedImage {
  url: string
  public_id: string
  width: number
  height: number
}

export function uploadImage(buffer: Buffer, folder: string): Promise<UploadedImage> {
  cloudinary.config({ secure: true })
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'))
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
        })
      },
    )
    stream.end(buffer)
  })
}

// Best-effort: a leftover Cloudinary asset is acceptable, a failed request is not.
export async function deleteImage(publicId: string): Promise<void> {
  try {
    cloudinary.config({ secure: true })
    await cloudinary.uploader.destroy(publicId)
  } catch (err) {
    console.error('Cloudinary destroy failed:', err)
  }
}
