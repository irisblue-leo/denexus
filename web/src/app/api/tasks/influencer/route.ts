import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createInfluencerTask,
  getInfluencerTasksByUser,
  generateId,
} from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await getInfluencerTasksByUser(user.id);
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error("Get influencer tasks error:", error);
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
    const { title, description, requirements, budget, deadline, category } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Create task
    const task = await createInfluencerTask({
      id: generateId("influencer"),
      userId: user.id,
      title,
      description,
      requirements,
      budget: budget ? parseFloat(budget) : undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      category,
    });

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        createdAt: task.created_at,
      },
    });
  } catch (error) {
    console.error("Create influencer task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
