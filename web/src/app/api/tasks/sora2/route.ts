import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createSora2Task,
  getSora2TasksByUser,
  generateId,
  deductUserCredits,
  deleteSora2Task,
  updateSora2TaskStatus,
} from "@/lib/db";
import { submitSora2Task, checkSora2TaskStatus } from "@/lib/sora2";
import { resizeImageFromUrlForSora2 } from "@/lib/image-resize";
import { uploadToOBS, generateFilePath } from "@/lib/obs";

// Download video from URL and upload to OBS
async function uploadVideoToOBS(videoUrl: string, taskId: string): Promise<string> {
  try {
    console.log(`Downloading video from: ${videoUrl}`);
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension
    let ext = "mp4";
    if (contentType.includes("webm")) ext = "webm";
    else if (contentType.includes("mov")) ext = "mov";

    // Upload to OBS
    const filePath = generateFilePath("system", `${taskId}.${ext}`, "generated");
    const obsUrl = await uploadToOBS(filePath, buffer, contentType);
    console.log(`Video uploaded to OBS: ${obsUrl}`);
    return obsUrl;
  } catch (error) {
    console.error("Failed to upload video to OBS:", error);
    // Return original URL if upload fails
    return videoUrl;
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await getSora2TasksByUser(user.id);
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error("Get sora2 tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Process Sora2 task in background
async function processSora2Task(
  taskId: string,
  prompt: string,
  orientation: "portrait" | "landscape",
  duration: number,
  imageUrl?: string
) {
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
        const filePath = generateFilePath("system", `${taskId}-resized.png`, "generated");
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
      duration,
      images,
    });

    if (!result.success) {
      await updateSora2TaskStatus(taskId, "failed", undefined, result.error);
      return;
    }

    // If video URL is returned directly
    if (result.videoUrl) {
      // Upload video to OBS
      const obsVideoUrl = await uploadVideoToOBS(result.videoUrl, taskId);
      await updateSora2TaskStatus(taskId, "completed", [obsVideoUrl]);
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
          // Upload video to OBS
          const obsVideoUrl = await uploadVideoToOBS(status.videoUrl, taskId);
          await updateSora2TaskStatus(taskId, "completed", [obsVideoUrl]);
          return;
        }

        if (status.status === "failed") {
          await updateSora2TaskStatus(taskId, "failed", undefined, status.error || "Video generation failed");
          return;
        }

        // Continue polling for pending/processing status
      }

      // Timeout
      await updateSora2TaskStatus(taskId, "failed", undefined, "Task timed out after 10 minutes");
    }
  } catch (error) {
    console.error("Sora2 task processing error:", error);
    await updateSora2TaskStatus(
      taskId,
      "failed",
      undefined,
      error instanceof Error ? error.message : "Unknown error"
    );
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

    // Calculate credits cost based on options
    // sora-2: 5 credits base, sora-2-pro: 50 credits base
    let baseCost = quality === "hd" ? 50 : 5;
    // Duration adjustments
    if (duration === "15s") baseCost = Math.round(baseCost * 1.5);
    if (duration === "20s") baseCost = Math.round(baseCost * 2);
    const creditsCost = baseCost * quantity;

    // Check if user has enough credits
    if (user.credits < creditsCost) {
      return NextResponse.json(
        { error: "Insufficient credits", required: creditsCost, available: user.credits },
        { status: 400 }
      );
    }

    // Deduct credits
    const deducted = await deductUserCredits(user.id, creditsCost);
    if (!deducted) {
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 400 }
      );
    }

    const taskId = generateId("sora2");

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
    processSora2Task(taskId, prompt, orientation, durationNum, productImage).catch((err) => {
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
