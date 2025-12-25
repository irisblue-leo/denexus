import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createNanoBananaTask,
  getNanoBananaTasksByUser,
  getNanoBananaTaskCount,
  generateId,
  deductCreditsWithTransaction,
  refundCredits,
  updateNanoBananaTaskStatus,
  createAsset,
  deleteNanoBananaTask,
  deleteNanoBananaTasks,
} from "@/lib/db";
import { generateNanoBananaImagesDirect } from "@/lib/nano-banana";
import { uploadBase64ToOBS, uploadFromURLToOBS, generateFilePath } from "@/lib/obs";

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
  await updateNanoBananaTaskStatus(taskId, "failed", undefined, errorMessage);

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
    taskType: "nano-banana",
  });
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
      getNanoBananaTasksByUser(user.id, limit, offset),
      getNanoBananaTaskCount(user.id),
    ]);

    return NextResponse.json({ success: true, tasks, total, page, limit });
  } catch (error) {
    console.error("Get nano-banana tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
    const { productImages, prompt, quantity = 1 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Calculate credits cost
    const creditsCost = 2 * quantity;

    // Check if user has enough credits
    if (user.credits < creditsCost) {
      return NextResponse.json(
        { error: "Insufficient credits", required: creditsCost, available: user.credits },
        { status: 400 }
      );
    }

    const taskId = generateId("nano");

    // Deduct credits with transaction record
    const deducted = await deductCreditsWithTransaction({
      userId: user.id,
      amount: creditsCost,
      description: `Nano Banana图片生成: ${prompt.substring(0, 50)}`,
      taskId,
      taskType: "nano-banana",
    });
    if (!deducted) {
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 400 }
      );
    }

    // Create task with pending status
    const task = await createNanoBananaTask({
      id: taskId,
      userId: user.id,
      productImages,
      prompt,
      quantity,
      creditsCost,
    });

    // Start async image generation
    processNanoBananaTask(taskId, user.id, prompt, productImages, quantity, creditsCost).catch((error) => {
      console.error("Background task error:", error);
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
    console.error("Create nano-banana task error:", error);
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

    const deleted = await deleteNanoBananaTask(taskId, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete nano-banana task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Background task processing
async function processNanoBananaTask(
  taskId: string,
  userId: string,
  prompt: string,
  productImages: string[] | undefined,
  quantity: number,
  creditsCost: number
) {
  try {
    // Update status to processing
    await updateNanoBananaTaskStatus(taskId, "processing");

    // Call 302.ai Nano Banana API
    const result = await generateNanoBananaImagesDirect({
      prompt,
      imageUrls: productImages,
      quantity,
    });

    if (!result.success || !result.images || result.images.length === 0) {
      await handleTaskFailure(taskId, userId, creditsCost, result.error || "No images generated");
      return;
    }

    // Upload generated images to OBS and save as assets
    const outputUrls: string[] = [];
    for (let i = 0; i < result.images.length; i++) {
      const image = result.images[i];
      try {
        let obsUrl: string;
        const filename = `nano-banana-${taskId}-${i}.png`;
        const filePath = generateFilePath(userId, filename, "generated");

        if (image.base64) {
          // Upload from base64
          obsUrl = await uploadBase64ToOBS(
            userId,
            image.base64,
            filename,
            "image/png",
            "generated"
          );
        } else if (image.url && !image.url.startsWith("data:")) {
          // Upload from URL
          obsUrl = await uploadFromURLToOBS(
            userId,
            image.url,
            filename,
            "generated"
          );
        } else if (image.url) {
          // It's a data URL, extract base64
          const base64Data = image.url.split(",")[1];
          obsUrl = await uploadBase64ToOBS(
            userId,
            base64Data,
            filename,
            "image/png",
            "generated"
          );
        } else {
          continue;
        }
        outputUrls.push(obsUrl);

        // Save as asset
        const assetId = generateId("asset");
        await createAsset({
          id: assetId,
          userId: userId,
          type: "image",
          source: "nano-banana",
          filename: filename,
          url: obsUrl,
          filePath: filePath,
          mimeType: "image/png",
          taskId: taskId,
        });
      } catch (uploadError) {
        console.error(`Error uploading image ${i}:`, uploadError);
      }
    }

    if (outputUrls.length > 0) {
      await updateNanoBananaTaskStatus(taskId, "completed", outputUrls);
    } else {
      await handleTaskFailure(taskId, userId, creditsCost, "Failed to upload generated images");
    }
  } catch (error) {
    console.error("Process nano-banana task error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await handleTaskFailure(taskId, userId, creditsCost, errorMessage);
  }
}
