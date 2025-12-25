// 302.AI Kling API Integration for Multi-Image to Video Generation

const API_KEY = process.env.JUHE_API_KEY || "";
const BASE_URL = process.env.JUHE_BASE_URL || "https://api.302.ai";
const ENABLED = process.env.JUHE_ENABLED === "true";

// Model: kling-v1-6 (only supported model for multi-image2video)
const MODEL_NAME = "kling-v1-6";

// Pricing (PTC per request):
// STD 5s: 0.3, STD 10s: 0.6
// PRO 5s: 0.5, PRO 10s: 1.0

interface KlingRequest {
  images: string[]; // max 4 image URLs
  prompt: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  duration: 5 | 10;
  mode?: "std" | "pro";
}

interface KlingResponse {
  success: boolean;
  taskId?: string;
  videoUrl?: string;
  status?: string;
  error?: string;
  rawResponse?: string;
}

interface KlingStatusResponse {
  success: boolean;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
  rawResponse?: string;
}

// Submit multi-image to video generation task
export async function submitKlingTask(request: KlingRequest): Promise<KlingResponse> {
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

  if (!request.images || request.images.length === 0) {
    return {
      success: false,
      error: "At least one image is required",
    };
  }

  if (request.images.length > 4) {
    return {
      success: false,
      error: "Maximum 4 images allowed",
    };
  }

  try {
    // Build image_list array
    const imageList = request.images.map((url) => ({ image: url }));

    const requestBody = {
      model_name: MODEL_NAME,
      image_list: imageList,
      mode: request.mode || "std",
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio,
      duration: request.duration,
    };

    console.log("Calling Kling API:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${BASE_URL}/klingai/v1/videos/multi-image2video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("Kling API response:", responseText);

    if (!response.ok) {
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }
      return {
        success: false,
        error: errorMessage,
        rawResponse: responseText,
      };
    }

    const result = JSON.parse(responseText);

    // Handle response format: { data: { task: { id: "kling_xxx" } }, status: 200 }
    if (result.status === 200 && result.data?.task?.id) {
      return {
        success: true,
        taskId: result.data.task.id,
        status: "pending",
        rawResponse: responseText,
      };
    }

    // Check for other success formats
    if (result.data?.task_id) {
      return {
        success: true,
        taskId: result.data.task_id,
        status: "pending",
        rawResponse: responseText,
      };
    }

    return {
      success: false,
      error: result.message || "Unknown response format",
      rawResponse: responseText,
    };
  } catch (error) {
    console.error("Kling API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Check task status
export async function checkKlingTaskStatus(taskId: string): Promise<KlingStatusResponse> {
  if (!ENABLED) {
    return {
      success: false,
      status: "failed",
      error: "302.AI API is not enabled",
    };
  }

  if (!API_KEY) {
    return {
      success: false,
      status: "failed",
      error: "302.AI API key is not configured",
    };
  }

  try {
    console.log("Checking Kling task status for:", taskId);

    const response = await fetch(`${BASE_URL}/klingai/v1/videos/multi-image2video/${taskId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    const responseText = await response.text();
    console.log("Kling status response:", responseText);

    if (!response.ok) {
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }
      return {
        success: false,
        status: "failed",
        error: errorMessage,
        rawResponse: responseText,
      };
    }

    const result = JSON.parse(responseText);

    // Handle response format: { data: { task_status, task_result: { videos: [{ url }] } } }
    const data = result.data;
    if (!data) {
      return {
        success: false,
        status: "failed",
        error: "Invalid response format",
        rawResponse: responseText,
      };
    }

    // Map task_status to our status
    let status: "pending" | "processing" | "completed" | "failed" = "pending";
    const taskStatus = data.task_status?.toLowerCase();

    if (taskStatus === "succeed" || taskStatus === "success" || taskStatus === "completed") {
      status = "completed";
    } else if (taskStatus === "failed" || taskStatus === "error") {
      status = "failed";
    } else if (taskStatus === "processing" || taskStatus === "processin") {
      status = "processing";
    } else if (taskStatus === "submitted" || taskStatus === "pending" || taskStatus === "queued") {
      status = "pending";
    }

    // Get video URL from task_result
    let videoUrl: string | undefined;
    if (data.task_result?.videos && Array.isArray(data.task_result.videos) && data.task_result.videos.length > 0) {
      videoUrl = data.task_result.videos[0].url || data.task_result.videos[0].video_url_download;
    }

    return {
      success: true,
      status,
      videoUrl,
      error: data.task_status_msg || undefined,
      rawResponse: responseText,
    };
  } catch (error) {
    console.error("Kling status check error:", error);
    return {
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Calculate credits cost based on mode and duration
export function calculateKlingCreditsCost(mode: "std" | "pro", duration: 5 | 10): number {
  // Pricing in PTC:
  // STD 5s: 0.3, STD 10s: 0.6
  // PRO 5s: 0.5, PRO 10s: 1.0
  // Convert to credits (1 PTC = 1 credit for simplicity, adjust if needed)
  if (mode === "std") {
    return duration === 5 ? 3 : 6; // 0.3 PTC * 10 = 3 credits, 0.6 PTC * 10 = 6 credits
  } else {
    return duration === 5 ? 5 : 10; // 0.5 PTC * 10 = 5 credits, 1.0 PTC * 10 = 10 credits
  }
}

// Get aspect ratio string based on orientation
export function getKlingAspectRatio(orientation: "portrait" | "landscape" | "square"): "16:9" | "9:16" | "1:1" {
  switch (orientation) {
    case "landscape":
      return "16:9";
    case "portrait":
      return "9:16";
    case "square":
      return "1:1";
    default:
      return "9:16";
  }
}
