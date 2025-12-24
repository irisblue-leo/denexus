// 302.AI API Integration for Nano Banana (Gemini Image Generation)

const API_KEY = process.env.JUHE_API_KEY || "";
const BASE_URL = process.env.JUHE_BASE_URL || "https://api.302.ai";
const ENABLED = process.env.JUHE_ENABLED === "true";

// Supported models:
// - gemini-2.5-flash-image-preview
// - gemini-2.5-flash-image
// - gemini-3-pro-image-preview (Nano Banana Pro)
const DEFAULT_MODEL = "gemini-3-pro-image-preview";

interface NanoBananaRequest {
  prompt: string;
  imageUrls?: string[];
  quantity?: number;
  model?: string;
}

interface NanoBananaResponse {
  success: boolean;
  images?: {
    url: string;
    base64?: string;
  }[];
  error?: string;
  rawResponse?: string;
}

// Call the Nano Banana API via 302.ai
export async function generateNanoBananaImages(
  request: NanoBananaRequest
): Promise<NanoBananaResponse> {
  if (!ENABLED) {
    return {
      success: false,
      error: "302.AI API is not enabled",
    };
  }

  if (!API_KEY) {
    return {
      success: false,
      error: "302.AI API key is not configured",
    };
  }

  try {
    // Build content array for OpenAI-compatible format
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    // Add text prompt first
    content.push({
      type: "text",
      text: request.prompt,
    });

    // Add images if provided
    if (request.imageUrls && request.imageUrls.length > 0) {
      for (const imageUrl of request.imageUrls) {
        content.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        });
      }
    }

    // Build request body
    const requestBody = {
      model: request.model || DEFAULT_MODEL,
      stream: false,
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
    };

    console.log("Calling 302.ai API:", JSON.stringify(requestBody, null, 2));

    // Make API request
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("302.ai API response:", responseText);

    if (!response.ok) {
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }
      console.error("302.AI API error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        rawResponse: responseText,
      };
    }

    const data = JSON.parse(responseText);
    const images: { url: string; base64?: string }[] = [];

    // Parse response - the content may contain markdown with images
    if (data.choices && data.choices.length > 0) {
      for (const choice of data.choices) {
        const messageContent = choice.message?.content;

        if (typeof messageContent === "string") {
          // First, look for markdown image format: ![...](url)
          const markdownImageRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
          let mdMatch: RegExpExecArray | null;
          while ((mdMatch = markdownImageRegex.exec(messageContent)) !== null) {
            const imgUrl = mdMatch[1];
            if (!images.some((img) => img.url === imgUrl)) {
              images.push({ url: imgUrl });
              console.log("Found markdown image URL:", imgUrl);
            }
          }

          // Look for base64 images in markdown format: ![...](data:image/...;base64,...)
          const base64Regex = /!\[.*?\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
          let match: RegExpExecArray | null;
          while ((match = base64Regex.exec(messageContent)) !== null) {
            const dataUrl = match[1];
            if (!images.some((img) => img.url === dataUrl)) {
              const base64Data = dataUrl.split(",")[1];
              images.push({
                url: dataUrl,
                base64: base64Data,
              });
              console.log("Found base64 image in markdown");
            }
          }

          // Also look for standalone data URLs
          const standaloneBase64Regex = /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g;
          let standaloneMatch: RegExpExecArray | null;
          while ((standaloneMatch = standaloneBase64Regex.exec(messageContent)) !== null) {
            const matchedUrl = standaloneMatch[0];
            if (!images.some((img) => img.url === matchedUrl)) {
              const base64Data = matchedUrl.split(",")[1];
              images.push({
                url: matchedUrl,
                base64: base64Data,
              });
              console.log("Found standalone base64 image");
            }
          }

          // Look for regular image URLs (http/https) not in markdown format
          const urlRegex = /https?:\/\/[^\s"')\]<>]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s"')\]<>]*)?/gi;
          let urlMatch: RegExpExecArray | null;
          while ((urlMatch = urlRegex.exec(messageContent)) !== null) {
            const foundUrl = urlMatch[0];
            if (!images.some((img) => img.url === foundUrl)) {
              images.push({ url: foundUrl });
              console.log("Found regular image URL:", foundUrl);
            }
          }
        } else if (Array.isArray(messageContent)) {
          // Handle array content format
          for (const item of messageContent) {
            if (item.type === "image" && item.source?.data) {
              const mimeType = item.source.media_type || "image/png";
              images.push({
                url: `data:${mimeType};base64,${item.source.data}`,
                base64: item.source.data,
              });
            } else if (item.type === "image_url" && item.image_url?.url) {
              images.push({ url: item.image_url.url });
            }
          }
        }
      }
    }

    return {
      success: images.length > 0,
      images,
      error: images.length === 0 ? "No images found in response" : undefined,
      rawResponse: responseText,
    };
  } catch (error) {
    console.error("Nano Banana API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Direct call using Gemini-style API (alternative)
export async function generateNanoBananaImagesDirect(
  request: NanoBananaRequest
): Promise<NanoBananaResponse> {
  // Use the same implementation as generateNanoBananaImages
  // since 302.ai uses OpenAI-compatible format
  return generateNanoBananaImages(request);
}
