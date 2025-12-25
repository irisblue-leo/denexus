import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createGemini3ReverseTask,
  getGemini3ReverseTasksByUser,
  getGemini3ReverseTaskCount,
  generateId,
  deductCreditsWithTransaction,
  refundCredits,
  updateGemini3ReverseTaskStatus,
  deleteGemini3ReverseTask,
  deleteGemini3ReverseTasks,
  canCreateNewTask,
  MAX_CONCURRENT_TASKS,
} from "@/lib/db";
import { reversePrompt } from "@/lib/gemini3-reverse";

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
  await updateGemini3ReverseTaskStatus(taskId, "failed", undefined, errorMessage);

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
    taskType: "gemini3-reverse",
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
      getGemini3ReverseTasksByUser(user.id, limit, offset),
      getGemini3ReverseTaskCount(user.id),
    ]);

    return NextResponse.json({ success: true, tasks, total, page, limit });
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

    // Check concurrent task limit
    const canCreate = await canCreateNewTask();
    if (!canCreate) {
      return NextResponse.json(
        { error: "Too many tasks in progress", code: "CONCURRENT_LIMIT", maxTasks: MAX_CONCURRENT_TASKS },
        { status: 429 }
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

    const taskId = generateId("gemini3");

    // Deduct credits with transaction record
    const deducted = await deductCreditsWithTransaction({
      userId: user.id,
      amount: creditsCost,
      description: `Gemini提示词反推: ${mode}`,
      taskId,
      taskType: "gemini3-reverse",
    });
    if (!deducted) {
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 400 }
      );
    }

    // Create task with pending status
    const task = await createGemini3ReverseTask({
      id: taskId,
      userId: user.id,
      mode,
      sourceUrl,
      creditsCost,
    });

    // Start async processing
    processReverseTask(taskId, user.id, sourceUrl, mode, creditsCost).catch((error) => {
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
  userId: string,
  sourceUrl: string,
  mode: "video" | "image",
  creditsCost: number
) {
  const startTime = Date.now();

  try {
    // Update status to processing
    await updateGemini3ReverseTaskStatus(taskId, "processing");

    // Call Gemini API for reverse prompt
    const result = await reversePrompt({
      sourceUrl,
      mode,
    });

    if (!result.success || !result.prompt) {
      await handleTaskFailure(taskId, userId, creditsCost, result.error || "Failed to generate prompt");
      return;
    }

    // Update task with result
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    await updateGemini3ReverseTaskStatus(taskId, "completed", result.prompt, undefined, durationSeconds);
  } catch (error) {
    console.error("Process reverse task error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await handleTaskFailure(taskId, userId, creditsCost, errorMessage);
  }
}
