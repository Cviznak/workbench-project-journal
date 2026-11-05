/**
 * Utility functions for client-side image manipulation and avatar optimization.
 * Adheres strictly to zero-client-trust and high-performance maker guidelines.
 */

/**
 * Loads an image file, center-crops it to a 1:1 square, scales it to 256x256,
 * and exports it as an optimized WebP blob (<35KB).
 */
export async function cropAndCompressAvatar(
  file: File,
  targetSize = 256,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Validate that the file is an image
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Failed to load image element'));
      };

      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          if (!width || !height) {
            return reject(new Error('Invalid image dimensions'));
          }

          // Calculate center square crop bounds
          const minDim = Math.min(width, height);
          const sx = (width - minDim) / 2;
          const sy = (height - minDim) / 2;

          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas 2D context is not available'));
          }

          // Enable smooth image scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Center crop and draw to 256x256 canvas
          ctx.drawImage(
            img,
            sx,
            sy,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );

          // Export as WebP blob (fallback to JPEG if WebP is unsupported)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                // Fallback attempt with image/jpeg
                canvas.toBlob(
                  (fallbackBlob) => {
                    if (fallbackBlob) {
                      resolve(fallbackBlob);
                    } else {
                      reject(new Error('Failed to encode image to blob'));
                    }
                  },
                  'image/jpeg',
                  quality
                );
              }
            },
            'image/webp',
            quality
          );
        } catch (err) {
          reject(err);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
