"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  RefreshCw,
  Download,
  Trash2,
  Image as ImageIcon,
  Video,
  File,
  Loader2,
  ExternalLink,
  Filter,
} from "lucide-react";

interface Asset {
  id: string;
  type: string;
  source: string | null;
  filename: string | null;
  url: string;
  fileSize: number | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
  taskId: string | null;
  createdAt: string;
}

type FilterType = "all" | "image" | "video";

export default function AssetsPage() {
  const t = useTranslations("workspace");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchAssets = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const typeParam = filter !== "all" ? `?type=${filter}` : "";
      const response = await fetch(`/api/assets${typeParam}`);
      const data = await response.json();
      if (data.success) {
        setAssets(data.assets);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleRefresh = () => {
    fetchAssets(true);
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm(t("confirmDelete"))) return;

    setDeleting(assetId);
    try {
      const response = await fetch("/api/assets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assetId }),
      });

      const data = await response.json();
      if (data.success) {
        setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
      }
    } catch (error) {
      console.error("Failed to delete asset:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (asset: Asset) => {
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = asset.filename || `asset-${asset.id}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download asset:", error);
      // Fallback: open in new tab
      window.open(asset.url, "_blank");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-5 h-5" />;
      case "video":
        return <Video className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isImage = (asset: Asset) => {
    return asset.type === "image" || asset.mimeType?.startsWith("image/");
  };

  const isVideo = (asset: Asset) => {
    return asset.type === "video" || asset.mimeType?.startsWith("video/");
  };

  if (loading) {
    return (
      <div className="p-6 h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("assets")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("assetsDescription")} ({assets.length})
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === "all"
                  ? "bg-white dark:bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("filterAll")}
            </button>
            <button
              onClick={() => setFilter("image")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === "image"
                  ? "bg-white dark:bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("filterImages")}
            </button>
            <button
              onClick={() => setFilter("video")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === "video"
                  ? "bg-white dark:bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("filterVideos")}
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-5 h-5 text-muted-foreground ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      {assets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t("noAssets")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("noAssetsDescription")}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white dark:bg-card rounded-xl border border-border overflow-hidden group hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
              >
                {/* Preview */}
                <div className="aspect-square relative bg-secondary/30">
                  {isImage(asset) ? (
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.filename || "Asset"}
                      className="w-full h-full object-cover"
                    />
                  ) : isVideo(asset) ? (
                    <video
                      src={asset.url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getTypeIcon(asset.type)}
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => window.open(asset.url, "_blank")}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
                      title={t("openInNewTab")}
                    >
                      <ExternalLink className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => handleDownload(asset)}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
                      title={t("download")}
                    >
                      <Download className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      disabled={deleting === asset.id}
                      className="p-2 bg-red-500/50 rounded-full hover:bg-red-500/70 transition-colors disabled:opacity-50"
                      title={t("delete")}
                    >
                      {deleting === asset.id ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>

                  {/* Type Badge */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded-md text-xs text-white flex items-center gap-1">
                    {getTypeIcon(asset.type)}
                    <span className="capitalize">{asset.type}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground truncate">
                    {asset.filename || `${asset.type}-${asset.id.slice(0, 8)}`}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(asset.fileSize)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(asset.createdAt)}
                    </span>
                  </div>
                  {asset.source && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-secondary text-xs text-muted-foreground rounded">
                      {asset.source}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
