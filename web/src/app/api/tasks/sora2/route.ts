import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createSora2Task,
  getSora2TasksByUser,
  getSora2TaskCount,
  generateId,
  deleteSora2Task,
  deleteSora2Tasks,
  updateSora2TaskStatus,
  createAsset,
  deductCreditsWithTransaction,
  refundCredits,
  getSora2TaskById,
  canCreateNewTask,
  MAX_CONCURRENT_TASKS,
} from "@/lib/db";
import { submitSora2Task, checkSora2TaskStatus } from "@/lib/sora2";
import { resizeImageFromUrlForSora2 } from "@/lib/image-resize";
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
      getSora2TasksByUser(user.id, limit, offset),
      getSora2TaskCount(user.id),
    ]);

    return NextResponse.json({ success: true, tasks, total, page, limit });
  } catch (error) {
    console.error("Get sora2 tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to handle task failure with potential refund
async function handleTaskFailure(
  taskId: string,
  userId: string,
  creditsCost: number,
  errorMessage: string
) {
  await updateSora2TaskStatus(taskId, "failed", undefined, errorMessage);

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
    taskType: "sora2",
  });
}

// Process Sora2 task in background
async function processSora2Task(
  taskId: string,
  userId: string,
  prompt: string,
  orientation: "portrait" | "landscape",
  duration: number,
  quality: "sd" | "hd",
  creditsCost: number,
  imageUrl?: string
) {
  const startTime = Date.now();

  // Select model and validate duration based on API docs:
  // sora-2: supports duration 10, 15
  // sora-2-pro: supports duration 15, 25
  let model: string;
  let apiDuration: number = duration;

  if (quality === "hd") {
    // HD uses sora-2-pro (supports 15, 25)
    model = "sora-2-pro";
    // If duration is 10, adjust to 15 for sora-2-pro
    if (duration === 10) {
      apiDuration = 15;
    }
  } else {
    // SD uses sora-2 (supports 10, 15)
    // But 25s requires sora-2-pro
    if (duration === 25) {
      model = "sora-2-pro";
    } else {
      model = "sora-2";
    }
  }
  try {
    // Update status to processing
    await updateSora2TaskStatus(taskId, "processing");

    // Prepare images array if image provided
    let images: string[] | undefined;
    if (imageUrl) {
      // Resize image to supported Sora2 size
      const resizeResult = await resizeImageFromUrlForSora2(imageUrl, orientation);
      if (resizeResult.success && resizeResult.buffer) {
        // Upload resized image to OBS
        const filePath = generateFilePath(userId, `${taskId}-resized.png`, "generated");
        const resizedImageUrl = await uploadToOBS(filePath, resizeResult.buffer, "image/png");
        images = [resizedImageUrl];
      } else {
        // If resize failed, try using original image
        console.warn("Image resize failed, using original:", resizeResult.error);
        images = [imageUrl];
      }
    }

    // Submit task to Sora2 API
    const result = await submitSora2Task({
      prompt,
      orientation,
      duration: apiDuration,
      images,
      model,
    });

    if (!result.success) {
      await handleTaskFailure(taskId, userId, creditsCost, result.error || "Unknown error");
      return;
    }

    // Helper function to save video and create asset
    const saveVideoAsAsset = async (videoUrl: string) => {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      const obsResult = await uploadVideoToOBS(videoUrl, taskId, userId);
      await updateSora2TaskStatus(taskId, "completed", [obsResult.url], undefined, durationSeconds);

      // Create asset record
      const assetId = generateId("asset");
      await createAsset({
        id: assetId,
        userId: userId,
        type: "video",
        source: "sora2",
        filename: `${taskId}.mp4`,
        url: obsResult.url,
        filePath: obsResult.filePath,
        fileSize: obsResult.fileSize,
        mimeType: obsResult.mimeType,
        taskId: taskId,
      });
      console.log(`Created asset ${assetId} for video ${obsResult.url}`);
    };

    // If video URL is returned directly
    if (result.videoUrl) {
      await saveVideoAsAsset(result.videoUrl);
      return;
    }

    // If task ID is returned, poll for completion
    if (result.taskId) {
      const maxAttempts = 120; // 10 minutes with 5s interval
      const pollInterval = 5000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        const status = await checkSora2TaskStatus(result.taskId);

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
      await handleTaskFailure(taskId, userId, creditsCost, "Task timed out after 10 minutes");
    }
  } catch (error) {
    console.error("Sora2 task processing error:", error);
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
      productImage,
      prompt,
      size = "portrait",
      duration = "10s",
      quality = "sd",
      quantity = 1,
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Check concurrent task limit
    const canCreate = await canCreateNewTask();
    if (!canCreate) {
      return NextResponse.json(
        { error: "Too many tasks in progress", code: "CONCURRENT_LIMIT", maxTasks: MAX_CONCURRENT_TASKS },
        { status: 429 }
      );
    }

    // Calculate credits cost based on options
    // sora-2: 5 credits base, sora-2-pro: 50 credits base
    let baseCost = quality === "hd" ? 50 : 5;
    // Duration adjustments
    if (duration === "15s") baseCost = Math.round(baseCost * 1.5);
    if (duration === "25s") baseCost = Math.round(baseCost * 2.5);
    const creditsCost = baseCost * quantity;

    // Check if user has enough credits
    if (user.credits < creditsCost) {
      return NextResponse.json(
        { error: "Insufficient credits", required: creditsCost, available: user.credits },
        { status: 400 }
      );
    }

    const taskId = generateId("sora2");

    // Deduct credits with transaction record
    const deducted = await deductCreditsWithTransaction({
      userId: user.id,
      amount: creditsCost,
      description: `Sora2视频生成: ${prompt.substring(0, 50)}`,
      taskId,
      taskType: "sora2",
    });
    if (!deducted) {
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 400 }
      );
    }

    // Create task
    const task = await createSora2Task({
      id: taskId,
      userId: user.id,
      productImage,
      prompt,
      size,
      duration,
      quality,
      quantity,
      creditsCost,
    });

    // Map size to orientation
    const orientation: "portrait" | "landscape" = size === "landscape" ? "landscape" : "portrait";

    // Parse duration string to number (e.g., "10s" -> 10)
    const durationNum = parseInt(duration.replace("s", "")) || 10;

    // Process in background
    processSora2Task(taskId, user.id, prompt, orientation, durationNum, quality as "sd" | "hd", creditsCost, productImage).catch((err) => {
      console.error("Background Sora2 processing error:", err);
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
    console.error("Create sora2 task error:", error);
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

    const deleted = await deleteSora2Task(taskId, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete sora2 task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
