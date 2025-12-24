import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createGemini3ReverseTask,
  getGemini3ReverseTasksByUser,
  generateId,
  deductUserCredits,
  updateGemini3ReverseTaskStatus,
  deleteGemini3ReverseTask,
} from "@/lib/db";
import { reversePrompt } from "@/lib/gemini3-reverse";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await getGemini3ReverseTasksByUser(user.id);
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error("Get gemini3-reverse tasks error:", error);
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
    const { mode = "video", sourceUrl } = body;

    if (!sourceUrl) {
      return NextResponse.json(
        { error: "Source URL is required" },
        { status: 400 }
      );
    }

    // Calculate credits cost
    const creditsCost = 2;

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
    const taskId = generateId("gemini3");
    const task = await createGemini3ReverseTask({
      id: taskId,
      userId: user.id,
      mode,
      sourceUrl,
      creditsCost,
    });

    // Start async processing
    processReverseTask(taskId, sourceUrl, mode).catch((error) => {
      console.error("Background reverse task error:", error);
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
    console.error("Create gemini3-reverse task error:", error);
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

    const deleted = await deleteGemini3ReverseTask(taskId, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete gemini3-reverse task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Background task processing
async function processReverseTask(
  taskId: string,
  sourceUrl: string,
  mode: "video" | "image"
) {
  try {
    // Update status to processing
    await updateGemini3ReverseTaskStatus(taskId, "processing");

    // Call Gemini API for reverse prompt
    const result = await reversePrompt({
      sourceUrl,
      mode,
    });

    if (!result.success || !result.prompt) {
      await updateGemini3ReverseTaskStatus(
        taskId,
        "failed",
        undefined,
        result.error || "Failed to generate prompt"
      );
      return;
    }

    // Update task with result
    await updateGemini3ReverseTaskStatus(taskId, "completed", result.prompt);
  } catch (error) {
    console.error("Process reverse task error:", error);
    await updateGemini3ReverseTaskStatus(
      taskId,
      "failed",
      undefined,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
