import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createVideoTask,
  getVideoTasksByUser,
  generateId,
  deductUserCredits,
  deleteVideoTask,
} from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await getVideoTasksByUser(user.id);
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error("Get video tasks error:", error);
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
    const {
      productImages,
      referenceVideoUrl,
      sellingPoints,
      size = "portrait",
      duration = "15s",
      quality = "sd",
      language = "en",
    } = body;

    // Calculate credits cost based on options
    let creditsCost = 10;
    if (quality === "hd") creditsCost += 5;
    if (duration === "30s") creditsCost += 5;
    if (duration === "60s") creditsCost += 10;

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

    // Create task
    const task = await createVideoTask({
      id: generateId("video"),
      userId: user.id,
      productImages,
      referenceVideoUrl,
      sellingPoints,
      size,
      duration,
      quality,
      language,
      creditsCost,
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
