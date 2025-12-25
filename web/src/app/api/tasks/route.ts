import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getVideoTasksByUser,
  getSora2TasksByUser,
  getNanoBananaTasksByUser,
  getGemini3ReverseTasksByUser,
  getInfluencerTasksByUser,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all task types in parallel
    const [videoTasks, sora2Tasks, nanoBananaTasks, gemini3ReverseTasks, influencerTasks] =
      await Promise.all([
        getVideoTasksByUser(user.id),
        getSora2TasksByUser(user.id),
        getNanoBananaTasksByUser(user.id),
        getGemini3ReverseTasksByUser(user.id),
        getInfluencerTasksByUser(user.id),
      ]);

    // Transform and merge all tasks with type info
    const allTasks = [
      ...videoTasks.map((t) => ({
        id: t.id,
        type: "video" as const,
        status: t.status,
        creditsCost: t.credits_cost,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        details: {
          size: t.size,
          duration: t.duration,
          quality: t.quality,
          language: t.language,
          resultUrl: t.result_url,
        },
      })),
      ...sora2Tasks.map((t) => ({
        id: t.id,
        type: "sora2" as const,
        status: t.status,
        creditsCost: t.credits_cost,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        details: {
          prompt: t.prompt,
          size: t.size,
          duration: t.duration,
          quality: t.quality,
          quantity: t.quantity,
          resultUrls: t.result_urls,
        },
      })),
      ...nanoBananaTasks.map((t) => ({
        id: t.id,
        type: "nano-banana" as const,
        status: t.status,
        creditsCost: t.credits_cost,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        details: {
          prompt: t.prompt,
          quantity: t.quantity,
          resultUrls: t.result_urls,
        },
      })),
      ...gemini3ReverseTasks.map((t) => ({
        id: t.id,
        type: "gemini3-reverse" as const,
        status: t.status,
        creditsCost: t.credits_cost,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        details: {
          mode: t.mode,
          sourceUrl: t.source_url,
          resultPrompt: t.result_prompt,
        },
      })),
      ...influencerTasks.map((t) => ({
        id: t.id,
        type: "influencer" as const,
        status: t.status,
        creditsCost: 0,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        details: {
          title: t.title,
          description: t.description,
          budget: t.budget,
          deadline: t.deadline,
          category: t.category,
          applicationsCount: t.applications_count,
        },
      })),
    ];

    // Sort by created_at desc
    allTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      tasks: allTasks,
      counts: {
        video: videoTasks.length,
        sora2: sora2Tasks.length,
        nanoBanana: nanoBananaTasks.length,
        gemini3Reverse: gemini3ReverseTasks.length,
        influencer: influencerTasks.length,
        total: allTasks.length,
      },
    });
  } catch (error) {
    console.error("Get all tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
