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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import DatePicker from "@/components/ui/DatePicker";

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

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type FilterType = "all" | "image" | "video";

export default function AssetsPage() {
  const t = useTranslations("workspace");
  const tc = useTranslations("common");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const { confirm, ConfirmDialog } = useConfirm();

  const fetchAssets = useCallback(async (showRefreshing = false, page = 1) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("type", filter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", page.toString());
      params.set("pageSize", "20");

      const response = await fetch(`/api/assets?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setAssets(data.assets);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, startDate, endDate]);

  useEffect(() => {
    fetchAssets(false, 1);
  }, [filter, startDate, endDate]);

  const handleRefresh = () => {
    fetchAssets(true, pagination.page);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setLoading(true);
    fetchAssets(false, newPage);
  };

  const handleDelete = async (assetId: string) => {
    const confirmed = await confirm({
      title: t("deleteAsset"),
      message: t("confirmDelete"),
      confirmText: tc("confirm"),
      cancelText: tc("cancel"),
      variant: "danger",
    });

    if (!confirmed) return;

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
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
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

  if (loading && assets.length === 0) {
    return (
      <div className="p-6 h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
    {ConfirmDialog}
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("assets")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("assetsDescription")} ({pagination.total})
            </p>
          </div>
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

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
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

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="开始日期"
            />
            <span className="text-muted-foreground">至</span>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="结束日期"
            />
          </div>
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
        <>
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            )}
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-border mt-4">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {/* First page */}
                {pagination.page > 3 && (
                  <>
                    <button
                      onClick={() => handlePageChange(1)}
                      className="px-3 py-1.5 text-sm rounded-lg hover:bg-secondary transition-colors"
                    >
                      1
                    </button>
                    {pagination.page > 4 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                  </>
                )}

                {/* Page numbers around current */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  if (pageNum < 1 || pageNum > pagination.totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        pagination.page === pageNum
                          ? "bg-primary-500 text-white"
                          : "hover:bg-secondary"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Last page */}
                {pagination.page < pagination.totalPages - 2 && pagination.totalPages > 5 && (
                  <>
                    {pagination.page < pagination.totalPages - 3 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(pagination.totalPages)}
                      className="px-3 py-1.5 text-sm rounded-lg hover:bg-secondary transition-colors"
                    >
                      {pagination.totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <span className="text-sm text-muted-foreground ml-4">
                共 {pagination.total} 项
              </span>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}
