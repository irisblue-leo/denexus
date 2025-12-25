import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteGemini3ReverseTasks } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskIds } = await request.json();
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "Task IDs are required" }, { status: 400 });
    }

    const deletedCount = await deleteGemini3ReverseTasks(taskIds, user.id);

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Batch delete gemini3-reverse tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
