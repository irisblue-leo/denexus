// 302.AI Sora2 API Integration for Video Generation

const API_KEY = process.env.JUHE_API_KEY || "";
const BASE_URL = process.env.JUHE_BASE_URL || "https://api.302.ai";
const ENABLED = process.env.JUHE_ENABLED === "true";

// Supported models
// sora-2: 0.1 PTC/次
// sora-2-pro: 1 PTC/次
const DEFAULT_MODEL = "sora-2";

// Supported image sizes for Sora2
// 1280x720 (landscape), 720x1280 (portrait), 1024x1792, 1792x1024
export const SORA2_SUPPORTED_SIZES = {
  landscape: { width: 1280, height: 720, label: "1280x720" },
  portrait: { width: 720, height: 1280, label: "720x1280" },
  tallPortrait: { width: 1024, height: 1792, label: "1024x1792" },
  wideLandscape: { width: 1792, height: 1024, label: "1792x1024" },
};

interface Sora2Request {
  prompt: string;
  orientation?: "portrait" | "landscape";
  size?: string;
  duration?: number;
  images?: string[];
  model?: string;
}

interface Sora2Response {
  success: boolean;
  taskId?: string;
  videoUrl?: string;
  status?: string;
  error?: string;
  rawResponse?: string;
  model?: string;
}

interface Sora2StatusResponse {
  success: boolean;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
  rawResponse?: string;
}

// Submit video generation task
export async function submitSora2Task(
  request: Sora2Request
): Promise<Sora2Response> {
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
    const model = request.model || DEFAULT_MODEL;

    // Determine size based on orientation
    // Supported: 720x1280, 1280x720, 1024x1792, 1792x1024
    const size = request.size || (request.orientation === "landscape" ? "1280x720" : "720x1280");

    // Build request body according to 302.AI Sora2 API spec
    const requestBody: Record<string, unknown> = {
      model: model,
      prompt: request.prompt,
      orientation: request.orientation || "portrait",
      size: size,
      duration: request.duration || 10,
    };

    // Add images if provided
    if (request.images && request.images.length > 0) {
      requestBody.images = request.images;
    }

    console.log("Calling Sora2 API:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${BASE_URL}/sora/v2/video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("Sora2 API response:", responseText);

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

    // Handle 302.AI response format: { code, data: { id, status, outputs, ... }, message }
    if (result.code === 200 && result.data) {
      const data = result.data;

      // Check if video is already completed with outputs
      if (data.status === "completed" && data.outputs && data.outputs.length > 0) {
        return {
          success: true,
          videoUrl: data.outputs[0],
          status: "completed",
          rawResponse: responseText,
          model: model,
        };
      }

      // Return task ID for polling (just the video_xxx part, we'll add model prefix when querying)
      if (data.id) {
        return {
          success: true,
          taskId: data.id, // e.g., "video_49b1dde2-4601-42ed-a287-57022e76e971"
          status: data.status || "queued",
          rawResponse: responseText,
          model: model,
        };
      }
    }

    // Fallback for other response formats
    const data = result.data || result;
    return {
      success: true,
      taskId: data.task_id || data.taskId || data.id,
      videoUrl: data.video_url || data.videoUrl || data.video,
      status: data.status || "pending",
      rawResponse: responseText,
      model: model,
    };
  } catch (error) {
    console.error("Sora2 API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Check task status
// taskId format: "video_xxx", will be prefixed with "sora-2"
// Note: According to 302.AI docs, the query ID format is always "sora-2:video_xxxx"
// regardless of whether sora-2 or sora-2-pro was used for generation
export async function checkSora2TaskStatus(
  taskId: string
): Promise<Sora2StatusResponse> {
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
    // API expects format: video_xxxx (no prefix needed)
    // Remove any prefix if present
    const queryId = taskId.includes(":") ? taskId.split(":")[1] : taskId;
    console.log("Checking Sora2 task status for:", queryId);

    const response = await fetch(`${BASE_URL}/sora/v2/video/${queryId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    const responseText = await response.text();
    console.log("Sora2 status response:", responseText);

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

    // Handle 302.AI response format: { code, data: { status, outputs, ... }, message } or direct format
    const data = result.data || result;

    // Determine status
    let status: "pending" | "processing" | "completed" | "failed" = "pending";
    const dataStatus = data.status?.toLowerCase() || "";

    if (dataStatus === "completed" || dataStatus === "success") {
      status = "completed";
    } else if (dataStatus === "failed" || dataStatus === "error") {
      status = "failed";
    } else if (dataStatus === "processing" || dataStatus === "running" || dataStatus === "in_progress") {
      status = "processing";
    } else if (dataStatus === "queued" || dataStatus === "pending") {
      status = "pending";
    }

    // Get video URL from outputs array
    let videoUrl: string | undefined;
    if (data.outputs && Array.isArray(data.outputs) && data.outputs.length > 0) {
      videoUrl = data.outputs[0];
    } else {
      videoUrl = data.video_url || data.videoUrl || data.video;
    }

    return {
      success: true,
      status,
      videoUrl,
      error: data.error || (result.message !== "success" ? result.message : undefined),
      rawResponse: responseText,
    };
  } catch (error) {
    console.error("Sora2 status check error:", error);
    return {
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Poll for task completion
export async function waitForSora2Completion(
  taskId: string,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<Sora2StatusResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkSora2TaskStatus(taskId);

    if (status.status === "completed" || status.status === "failed") {
      return status;
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return {
    success: false,
    status: "failed",
    error: "Task timed out",
  };
}

// Get size string based on orientation
export function getSora2Size(orientation: "portrait" | "landscape"): string {
  return orientation === "portrait" ? "720x1280" : "1280x720";
}

// Get target dimensions for image resize
export function getSora2TargetDimensions(orientation: "portrait" | "landscape"): { width: number; height: number } {
  return orientation === "portrait"
    ? { width: 720, height: 1280 }
    : { width: 1280, height: 720 };
}
