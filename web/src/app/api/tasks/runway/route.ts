import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createRunwayTask,
  getRunwayTasksByUser,
  getRunwayTaskCount,
  generateId,
  deductCreditsWithTransaction,
  refundCredits,
  deleteRunwayTask,
  updateRunwayTaskStatus,
  createAsset,
  canCreateNewTask,
  MAX_CONCURRENT_TASKS,
} from "@/lib/db";
import { submitRunwayTask, checkRunwayTaskStatus, getRunwayCreditsCost } from "@/lib/runway";
import { uploadToOBS, generateFilePath } from "@/lib/obs";

// Content policy violation keywords - do not refund for these
const CONTENT_POLICY_KEYWORDS = [
  "content policy",
  "safety",
  "inappropriate",
  "violat",
  "prohibited",
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
  await updateRunwayTaskStatus(taskId, "failed", undefined, errorMessage);

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
    taskType: "runway",
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
      getRunwayTasksByUser(user.id, limit, offset),
      getRunwayTaskCount(user.id),
    ]);

    return NextResponse.json({ success: true, tasks, total, page, limit });
  } catch (error) {
    console.error("Get runway tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Process runway task in background
async function processRunwayTask(
  taskId: string,
  userId: string,
  videoUrl: string,
  textPrompt: string | undefined,
  structureTransformation: number,
  creditsCost: number
) {
  const startTime = Date.now();

  try {
    // Update status to processing
    await updateRunwayTaskStatus(taskId, "processing");

    // Submit task to Runway API
    const result = await submitRunwayTask({
      videoUrl,
      textPrompt,
      structureTransformation,
    });

    if (!result.success) {
      await handleTaskFailure(taskId, userId, creditsCost, result.error || "Unknown error");
      return;
    }

    // Update external task ID
    if (result.taskId) {
      await updateRunwayTaskStatus(taskId, "processing", undefined, undefined, result.taskId);
    }

    // Helper function to save video and create asset
    const saveVideoAsAsset = async (resultVideoUrl: string) => {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      const obsResult = await uploadVideoToOBS(resultVideoUrl, taskId, userId);
      await updateRunwayTaskStatus(taskId, "completed", obsResult.url, undefined, undefined, durationSeconds);

      // Create asset record
      const assetId = generateId("asset");
      await createAsset({
        id: assetId,
        userId: userId,
        type: "video",
        source: "runway",
        filename: `${taskId}.mp4`,
        url: obsResult.url,
        filePath: obsResult.filePath,
        fileSize: obsResult.fileSize,
        mimeType: obsResult.mimeType,
        taskId: taskId,
      });
      console.log(`Created asset ${assetId} for video ${obsResult.url}`);
    };

    // Poll for completion
    if (result.taskId) {
      const maxAttempts = 180; // 15 minutes with 5s interval
      const pollInterval = 5000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        const status = await checkRunwayTaskStatus(result.taskId);

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
    console.error("Runway task processing error:", error);
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
      videoUrl,
      textPrompt,
      structureTransformation = 0.5,
    } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { error: "Video URL is required" },
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

    // Calculate credits cost
    const creditsCost = getRunwayCreditsCost();

    // Check if user has enough credits
    if (user.credits < creditsCost) {
      return NextResponse.json(
        { error: "Insufficient credits", required: creditsCost, available: user.credits },
        { status: 400 }
      );
    }

    const taskId = generateId("runway");

    // Deduct credits with transaction record
    const deducted = await deductCreditsWithTransaction({
      userId: user.id,
      amount: creditsCost,
      description: `视频生视频: ${textPrompt?.substring(0, 50) || "无提示词"}`,
      taskId,
      taskType: "runway",
    });
    if (!deducted) {
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 400 }
      );
    }

    // Create task
    const task = await createRunwayTask({
      id: taskId,
      userId: user.id,
      sourceVideoUrl: videoUrl,
      textPrompt,
      structureTransformation,
      creditsCost,
    });

    // Process in background
    processRunwayTask(taskId, user.id, videoUrl, textPrompt, structureTransformation, creditsCost).catch((err) => {
      console.error("Background runway processing error:", err);
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
    console.error("Create runway task error:", error);
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

    const deleted = await deleteRunwayTask(taskId, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete runway task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
