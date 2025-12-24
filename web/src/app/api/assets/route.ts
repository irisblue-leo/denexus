import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAssetsByUser, deleteAsset, getAssetById, generateId } from "@/lib/db";
import { deleteFromOBS } from "@/lib/obs";

// GET - List user assets
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const assets = await getAssetsByUser(user.id, type, limit, offset);

    return NextResponse.json({
      success: true,
      assets: assets.map((asset) => ({
        id: asset.id,
        type: asset.type,
        source: asset.source,
        filename: asset.filename,
        url: asset.url,
        fileSize: asset.file_size,
        mimeType: asset.mime_type,
        width: asset.width,
        height: asset.height,
        thumbnailUrl: asset.thumbnail_url,
        taskId: asset.task_id,
        createdAt: asset.created_at,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an asset
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { assetId } = await request.json();
    if (!assetId) {
      return NextResponse.json(
        { success: false, error: "Asset ID is required" },
        { status: 400 }
      );
    }

    // Get asset to verify ownership and get file path
    const asset = await getAssetById(assetId);
    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found" },
        { status: 404 }
      );
    }

    if (asset.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Try to delete from OBS if file_path exists
    if (asset.file_path) {
      try {
        await deleteFromOBS(asset.file_path);
      } catch (obsError) {
        console.error("Failed to delete from OBS:", obsError);
        // Continue with database deletion even if OBS deletion fails
      }
    }

    // Delete from database
    const deleted = await deleteAsset(assetId, user.id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Failed to delete asset" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete asset:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
