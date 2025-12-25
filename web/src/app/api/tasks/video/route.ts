import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createVideoTask,
  getVideoTasksByUser,
  getVideoTaskCount,
  generateId,
  deductCreditsWithTransaction,
  refundCredits,
  deleteVideoTask,
  updateVideoTaskStatus,
  createAsset,
} from "@/lib/db";
import { submitKlingTask, checkKlingTaskStatus, getKlingAspectRatio, calculateKlingCreditsCost } from "@/lib/kling";
import { uploadToOBS, generateFilePath } from "@/lib/obs";

// Content policy violation keywords - do not refund for these
const CONTENT_POLICY_KEYWORDS = [
  "content policy",
  "safety",
  "inappropriate",
  "violat",
  "prohibited",
  "人脸",
  "真人",
  "版权",
  "违规",
  "侵权",
  "不当内容",
  "policy violation",
  "moderation",
];

function isContentPolicyViolation(errorMessage: string): boolean {
  if (!errorMessage) return false;
  const lowerError = errorMessage.toLowerCase();
  return CONTENT_POLICY_KEYWORDS.some(keyword =>
    lowerError.includes(keyword.toLowerCase())
  );
}

// Helper function to handle task failure with potential refund
async function handleTaskFailure(
  taskId: string,
  userId: string,
  creditsCost: number,
  errorMessage: string
) {
  await updateVideoTaskStatus(taskId, "failed", undefined, errorMessage);

  // Check if this is a content policy violation - do not refund
  if (isContentPolicyViolation(errorMessage)) {
    console.log(`Task ${taskId} failed due to content policy violation, no refund`);
    return;
  }

  // Refund credits for non-policy failures
  console.log(`Refunding ${creditsCost} credits for task ${taskId}`);
  await refundCredits({
    userId,
    amount: creditsCost,
    description: `任务失败退款: ${errorMessage.substring(0, 100)}`,
    taskId,
    taskType: "video",
  });
}

// Download video from URL and upload to OBS with retry
async function uploadVideoToOBS(
  videoUrl: string,
  taskId: string,
  userId: string,
  maxRetries = 3
): Promise<{ url: string; filePath: string; fileSize: number; mimeType: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Downloading video from: ${videoUrl} (attempt ${attempt}/${maxRetries})`);

      // Download with longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      const response = await fetch(videoUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "video/mp4";
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`Video downloaded, size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

      // Determine file extension
      let ext = "mp4";
      if (contentType.includes("webm")) ext = "webm";
      else if (contentType.includes("mov")) ext = "mov";

      // Upload to OBS
      const filePath = generateFilePath(userId, `${taskId}.${ext}`, "generated");
      const obsUrl = await uploadToOBS(filePath, buffer, contentType);
      console.log(`Video uploaded to OBS: ${obsUrl}`);
      return {
        url: obsUrl,
        filePath,
        fileSize: buffer.length,
        mimeType: contentType,
      };
    } catch (error) {
      console.error(`Failed to upload video to OBS (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${waitTime / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // All retries failed, return original URL
  console.log("All upload attempts failed, using original URL");
  return {
    url: videoUrl,
    filePath: "",
    fileSize: 0,
    mimeType: "video/mp4",
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      getVideoTasksByUser(user.id, limit, offset),
      getVideoTaskCount(user.id),
    ]);

    return NextResponse.json({ success: true, tasks, total, page, limit });
  } catch (error) {
    console.error("Get video tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Process video task in background
async function processVideoTask(
  taskId: string,
  userId: string,
  images: string[],
  prompt: string,
  aspectRatio: "portrait" | "landscape" | "square",
  duration: 5 | 10,
  mode: "std" | "pro",
  creditsCost: number
) {
  try {
    // Update status to processing
    await updateVideoTaskStatus(taskId, "processing");

    // Convert aspect ratio to Kling format
    const klingAspectRatio = getKlingAspectRatio(aspectRatio);

    // Submit task to Kling API
    const result = await submitKlingTask({
      images,
      prompt,
      aspectRatio: klingAspectRatio,
      duration,
      mode,
    });

    if (!result.success) {
      await handleTaskFailure(taskId, userId, creditsCost, result.error || "Unknown error");
      return;
    }

    // Helper function to save video and create asset
    const saveVideoAsAsset = async (videoUrl: string) => {
      const obsResult = await uploadVideoToOBS(videoUrl, taskId, userId);
      await updateVideoTaskStatus(taskId, "completed", [obsResult.url]);

      // Create asset record
      const assetId = generateId("asset");
      await createAsset({
        id: assetId,
        userId: userId,
        type: "video",
        source: "kling",
        filename: `${taskId}.mp4`,
        url: obsResult.url,
        filePath: obsResult.filePath,
        fileSize: obsResult.fileSize,
        mimeType: obsResult.mimeType,
        taskId: taskId,
      });
      console.log(`Created asset ${assetId} for video ${obsResult.url}`);
    };

    // If video URL is returned directly (unlikely for Kling)
    if (result.videoUrl) {
      await saveVideoAsAsset(result.videoUrl);
      return;
    }

    // If task ID is returned, poll for completion
    if (result.taskId) {
      const maxAttempts = 180; // 15 minutes with 5s interval
      const pollInterval = 5000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        const status = await checkKlingTaskStatus(result.taskId);

        if (status.status === "completed" && status.videoUrl) {
          await saveVideoAsAsset(status.videoUrl);
          return;
        }

        if (status.status === "failed") {
          await handleTaskFailure(taskId, userId, creditsCost, status.error || "Video generation failed");
          return;
        }

        // Continue polling for pending/processing status
      }

      // Timeout
      await handleTaskFailure(taskId, userId, creditsCost, "Task timed out after 15 minutes");
    }
  } catch (error) {
    console.error("Video task processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await handleTaskFailure(taskId, userId, creditsCost, errorMessage);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      images,
      prompt,
      aspectRatio = "portrait",
      duration = 5,
      mode = "std",
    } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }

    if (images.length > 4) {
      return NextResponse.json(
        { error: "Maximum 4 images allowed" },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Calculate credits cost
    const creditsCost = calculateKlingCreditsCost(mode, duration);

    // Check if user has enough credits
    if (user.credits < creditsCost) {
      return NextResponse.json(
        { error: "Insufficient credits", required: creditsCost, available: user.credits },
        { status: 400 }
      );
    }

    const taskId = generateId("video");

    // Deduct credits with transaction record
    const deducted = await deductCreditsWithTransaction({
      userId: user.id,
      amount: creditsCost,
      description: `多图生视频: ${prompt.substring(0, 50)}`,
      taskId,
      taskType: "video",
    });
    if (!deducted) {
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 400 }
      );
    }

    // Create task
    const task = await createVideoTask({
      id: taskId,
      userId: user.id,
      productImages: images,
      prompt,
      size: aspectRatio,
      duration: `${duration}s`,
      quality: mode,
      creditsCost,
    });

    // Process in background
    processVideoTask(taskId, user.id, images, prompt, aspectRatio, duration, mode, creditsCost).catch((err) => {
      console.error("Background video processing error:", err);
    });

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        creditsCost: task.credits_cost,
        createdAt: task.created_at,
      },
    });
  } catch (error) {
    console.error("Create video task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await request.json();
    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const deleted = await deleteVideoTask(taskId, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete video task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
