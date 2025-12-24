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
    // Determine size based on orientation
    let size = request.size;
    if (!size) {
      size = request.orientation === "portrait" ? "720x1280" : "1280x720";
    }

    const requestBody: Record<string, unknown> = {
      model: request.model || DEFAULT_MODEL,
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

    const data = JSON.parse(responseText);

    // The API returns a task ID for async processing
    // Or directly returns the video URL if completed immediately
    if (data.video_url || data.videoUrl) {
      return {
        success: true,
        videoUrl: data.video_url || data.videoUrl,
        status: "completed",
        rawResponse: responseText,
      };
    }

    if (data.task_id || data.taskId || data.id) {
      return {
        success: true,
        taskId: data.task_id || data.taskId || data.id,
        status: "pending",
        rawResponse: responseText,
      };
    }

    // Handle different response formats
    return {
      success: true,
      taskId: data.task_id || data.taskId || data.id,
      videoUrl: data.video_url || data.videoUrl || data.video,
      status: data.status || "pending",
      rawResponse: responseText,
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
    const response = await fetch(`${BASE_URL}/sora/v2/video/${taskId}`, {
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

    const data = JSON.parse(responseText);

    // Determine status
    let status: "pending" | "processing" | "completed" | "failed" = "pending";
    if (data.status === "completed" || data.status === "success" || data.video_url || data.videoUrl) {
      status = "completed";
    } else if (data.status === "failed" || data.status === "error") {
      status = "failed";
    } else if (data.status === "processing" || data.status === "running") {
      status = "processing";
    }

    return {
      success: true,
      status,
      videoUrl: data.video_url || data.videoUrl || data.video,
      error: data.error || data.message,
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
