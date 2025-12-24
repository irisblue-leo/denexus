import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createNanoBananaTask,
  getNanoBananaTasksByUser,
  generateId,
  deductUserCredits,
  updateNanoBananaTaskStatus,
  createAsset,
  deleteNanoBananaTask,
} from "@/lib/db";
import { generateNanoBananaImagesDirect } from "@/lib/nano-banana";
import { uploadBase64ToOBS, uploadFromURLToOBS, generateFilePath } from "@/lib/obs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await getNanoBananaTasksByUser(user.id);
    return NextResponse.json({ success: true, tasks });
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

    // Deduct credits
    const deducted = await deductUserCredits(user.id, creditsCost);
    if (!deducted) {
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 400 }
      );
    }

    // Create task with pending status
    const taskId = generateId("nano");
    const task = await createNanoBananaTask({
      id: taskId,
      userId: user.id,
      productImages,
      prompt,
      quantity,
      creditsCost,
    });

    // Start async image generation
    processNanoBananaTask(taskId, user.id, prompt, productImages, quantity).catch((error) => {
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
  quantity: number
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
      await updateNanoBananaTaskStatus(taskId, "failed", undefined, result.error || "No images generated");
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
      await updateNanoBananaTaskStatus(taskId, "failed", undefined, "Failed to upload generated images");
    }
  } catch (error) {
    console.error("Process nano-banana task error:", error);
    await updateNanoBananaTaskStatus(
      taskId,
      "failed",
      undefined,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
