// 302.AI Runway Gen-3 Video-to-Video API Integration

const API_KEY = process.env.JUHE_API_KEY || "";
const BASE_URL = process.env.JUHE_BASE_URL || "https://api.302.ai";
const ENABLED = process.env.JUHE_ENABLED === "true";

// Pricing: 0.5 PTC per request = 5 credits
const CREDITS_COST = 5;

interface RunwaySubmitRequest {
  videoUrl: string; // URL of the source video
  textPrompt?: string; // Optional prompt (English only)
  structureTransformation?: number; // 0.1-0.9, default 0.5
}

interface RunwaySubmitResponse {
  success: boolean;
  taskId?: string;
  status?: string;
  error?: string;
  rawResponse?: string;
}

interface RunwayStatusResponse {
  success: boolean;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  previewUrls?: string[];
  error?: string;
  rawResponse?: string;
}

// Submit video-to-video generation task
export async function submitRunwayTask(request: RunwaySubmitRequest): Promise<RunwaySubmitResponse> {
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

  if (!request.videoUrl) {
    return {
      success: false,
      error: "Video URL is required",
    };
  }

  try {
    // Download the video first to get it as a blob
    console.log("Downloading video from:", request.videoUrl);
    const videoResponse = await fetch(request.videoUrl);
    if (!videoResponse.ok) {
      return {
        success: false,
        error: `Failed to download video: ${videoResponse.statusText}`,
      };
    }

    const videoBlob = await videoResponse.blob();
    console.log(`Video downloaded, size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);

    // Create FormData
    const formData = new FormData();
    formData.append("video_prompt", videoBlob, "video.mp4");

    if (request.textPrompt) {
      formData.append("text_prompt", request.textPrompt);
    }

    formData.append(
      "structure_transformation",
      String(request.structureTransformation || 0.5)
    );

    console.log("Submitting to Runway API...");

    const response = await fetch(`${BASE_URL}/runway/submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      body: formData,
    });

    const responseText = await response.text();
    console.log("Runway API response:", responseText);

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

    // Handle response format: { task: { id: "runway_xxx", status: "..." } }
    if (result.task?.id) {
      return {
        success: true,
        taskId: result.task.id,
        status: result.task.status,
        rawResponse: responseText,
      };
    }

    return {
      success: false,
      error: result.message || "Unknown response format",
      rawResponse: responseText,
    };
  } catch (error) {
    console.error("Runway API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Check task status
export async function checkRunwayTaskStatus(taskId: string): Promise<RunwayStatusResponse> {
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
    console.log("Checking Runway task status for:", taskId);

    const response = await fetch(`${BASE_URL}/runway/task/${taskId}/fetch`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    const responseText = await response.text();
    console.log("Runway status response:", responseText);

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
    const task = result.task;

    if (!task) {
      return {
        success: false,
        status: "failed",
        error: "Invalid response format",
        rawResponse: responseText,
      };
    }

    // Map Runway status to our status
    let status: "pending" | "processing" | "completed" | "failed" = "pending";
    const taskStatus = task.status?.toUpperCase();

    if (taskStatus === "SUCCEEDED") {
      status = "completed";
    } else if (taskStatus === "FAILED" || taskStatus === "ERROR") {
      status = "failed";
    } else if (taskStatus === "RUNNING" || taskStatus === "PROCESSING") {
      status = "processing";
    } else if (taskStatus === "THROTTLED" || taskStatus === "PENDING" || taskStatus === "QUEUED") {
      status = "pending";
    }

    // Get video URL from artifacts
    let videoUrl: string | undefined;
    let previewUrls: string[] | undefined;

    if (task.artifacts && Array.isArray(task.artifacts) && task.artifacts.length > 0) {
      videoUrl = task.artifacts[0].url;
      previewUrls = task.artifacts[0].previewUrls;
    }

    return {
      success: true,
      status,
      videoUrl,
      previewUrls,
      rawResponse: responseText,
    };
  } catch (error) {
    console.error("Runway status check error:", error);
    return {
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get credits cost
export function getRunwayCreditsCost(): number {
  return CREDITS_COST;
}
