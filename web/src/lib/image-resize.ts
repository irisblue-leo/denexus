// Image processing utilities for Sora2

// Supported Sora2 image sizes
export const SORA2_SIZES = {
  landscape: { width: 1280, height: 720 },
  portrait: { width: 720, height: 1280 },
};

interface ResizeResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
}

// Resize image using sharp (if available) or return original
export async function resizeImageForSora2(
  imageBuffer: Buffer,
  orientation: "portrait" | "landscape"
): Promise<ResizeResult> {
  const targetSize = SORA2_SIZES[orientation];

  try {
    // Dynamically import sharp
    const sharp = (await import("sharp")).default;

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Check if resize is needed
    if (originalWidth === targetSize.width && originalHeight === targetSize.height) {
      return { success: true, buffer: imageBuffer };
    }

    // Calculate crop/resize dimensions to maintain aspect ratio and fill target size
    const targetAspect = targetSize.width / targetSize.height;
    const originalAspect = originalWidth / originalHeight;

    let resizeWidth: number;
    let resizeHeight: number;

    if (originalAspect > targetAspect) {
      // Image is wider, resize by height and crop width
      resizeHeight = targetSize.height;
      resizeWidth = Math.round(originalWidth * (targetSize.height / originalHeight));
    } else {
      // Image is taller, resize by width and crop height
      resizeWidth = targetSize.width;
      resizeHeight = Math.round(originalHeight * (targetSize.width / originalWidth));
    }

    // Resize and center crop to exact dimensions
    const resizedBuffer = await sharp(imageBuffer)
      .resize(resizeWidth, resizeHeight, {
        fit: "cover",
        position: "center",
      })
      .extract({
        left: Math.max(0, Math.round((resizeWidth - targetSize.width) / 2)),
        top: Math.max(0, Math.round((resizeHeight - targetSize.height) / 2)),
        width: targetSize.width,
        height: targetSize.height,
      })
      .png()
      .toBuffer();

    return { success: true, buffer: resizedBuffer };
  } catch (error) {
    console.error("Image resize error:", error);

    // If sharp fails, try alternative approach or return original
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resize image",
      buffer: imageBuffer, // Return original as fallback
    };
  }
}

// Resize image from URL for Sora2
export async function resizeImageFromUrlForSora2(
  imageUrl: string,
  orientation: "portrait" | "landscape"
): Promise<ResizeResult> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch image: ${response.statusText}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Resize the image
    return resizeImageForSora2(imageBuffer, orientation);
  } catch (error) {
    console.error("Image fetch/resize error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process image",
    };
  }
}

// Check if image needs resizing
export async function checkImageSize(
  imageBuffer: Buffer
): Promise<{ width: number; height: number; needsResize: boolean; suggestedOrientation: "portrait" | "landscape" }> {
  try {
    const sharp = (await import("sharp")).default;
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    const isPortraitSize = width === 720 && height === 1280;
    const isLandscapeSize = width === 1280 && height === 720;
    const needsResize = !isPortraitSize && !isLandscapeSize;

    // Suggest orientation based on original aspect ratio
    const suggestedOrientation: "portrait" | "landscape" = height > width ? "portrait" : "landscape";

    return {
      width,
      height,
      needsResize,
      suggestedOrientation,
    };
  } catch {
    return {
      width: 0,
      height: 0,
      needsResize: true,
      suggestedOrientation: "portrait",
    };
  }
}
