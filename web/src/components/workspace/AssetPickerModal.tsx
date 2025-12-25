"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X, Upload, Loader2, Check, Image as ImageIcon, Video } from "lucide-react";

interface Asset {
  id: string;
  type: "image" | "video";
  source: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
}

interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: { url: string; filename: string }) => void;
  acceptType: "image" | "video" | "all";
  title?: string;
  multiSelect?: boolean;
  maxCount?: number;
  currentCount?: number;
}

export default function AssetPickerModal({
  isOpen,
  onClose,
  onSelect,
  acceptType,
  title,
  multiSelect = false,
  maxCount = 1,
  currentCount = 0,
}: AssetPickerModalProps) {
  const t = useTranslations("workspace");
  const [activeTab, setActiveTab] = useState<"upload" | "resources">("upload");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const limit = 20;
  const remainingCount = maxCount - currentCount;

  // Fetch assets from API
  const fetchAssets = useCallback(async (reset = false) => {
    setLoading(true);
    setError("");

    try {
      const currentOffset = reset ? 0 : offset;
      const typeParam = acceptType === "all" ? "" : `&type=${acceptType}`;
      const response = await fetch(
        `/api/assets?limit=${limit}&offset=${currentOffset}${typeParam}`
      );
      const data = await response.json();

      if (data.success) {
        const newAssets = data.assets as Asset[];
        if (reset) {
          setAssets(newAssets);
          setOffset(limit);
        } else {
          setAssets((prev) => [...prev, ...newAssets]);
          setOffset((prev) => prev + limit);
        }
        setHasMore(newAssets.length === limit);
      } else {
        setError(data.error || "Failed to fetch assets");
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }, [offset, acceptType, t]);

  // Load assets when switching to resources tab
  useEffect(() => {
    if (isOpen && activeTab === "resources") {
      setOffset(0);
      fetchAssets(true);
    }
  }, [isOpen, activeTab]);

  // Reset selected assets when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAssets([]);
    }
  }, [isOpen]);

  // Handle file upload (supports multiple files)
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Limit the number of files to upload
    const filesToUpload = Array.from(files).slice(0, remainingCount);

    if (filesToUpload.length === 0) {
      setError(t("maxImagesReached"));
      return;
    }

    // Validate file types
    for (const file of filesToUpload) {
      if (acceptType === "image" && !file.type.startsWith("image/")) {
        setError(t("invalidFileType"));
        return;
      }
      if (acceptType === "video" && !file.type.startsWith("video/")) {
        setError(t("invalidFileType"));
        return;
      }

      // Validate file size (50MB max for videos, 10MB for images)
      const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(t("fileTooLarge"));
        return;
      }
    }

    setUploading(true);
    setError("");

    try {
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          onSelect({
            url: data.url,
            filename: data.filename,
          });
        } else {
          setError(data.error || t("uploadFailed"));
          break;
        }
      }
      onClose();
    } catch {
      setError(t("networkError"));
    } finally {
      setUploading(false);
    }
  }, [acceptType, onSelect, onClose, t, remainingCount]);

  // Handle asset selection from resources (toggle for multi-select)
  const handleAssetClick = (asset: Asset) => {
    if (multiSelect) {
      const isSelected = selectedAssets.some(a => a.id === asset.id);
      if (isSelected) {
        setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
      } else {
        if (selectedAssets.length < remainingCount) {
          setSelectedAssets(prev => [...prev, asset]);
        }
      }
    } else {
      onSelect({
        url: asset.url,
        filename: asset.filename,
      });
      onClose();
    }
  };

  // Confirm multi-select
  const handleConfirmSelection = () => {
    for (const asset of selectedAssets) {
      onSelect({
        url: asset.url,
        filename: asset.filename,
      });
    }
    onClose();
  };

  // Check if asset is selected
  const isAssetSelected = (asset: Asset) => {
    return selectedAssets.some(a => a.id === asset.id);
  };

  // Get accept string for file input
  const getAcceptString = () => {
    if (acceptType === "image") return "image/*";
    if (acceptType === "video") return "video/*";
    return "image/*,video/*";
  };

  // Get title based on type
  const getTitle = () => {
    if (title) return title;
    if (acceptType === "image") return t("selectImage");
    if (acceptType === "video") return t("selectVideo");
    return t("selectAsset");
  };

  // Get upload hint text
  const getUploadHint = () => {
    if (multiSelect && acceptType === "image") {
      return t("selectUpToImages", { count: remainingCount });
    }
    if (acceptType === "image") return t("uploadImageHint");
    if (acceptType === "video") return t("uploadVideoHint");
    return t("selectFile");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-card rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{getTitle()}</h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "upload"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("myFiles")}
          </button>
          <button
            onClick={() => setActiveTab("resources")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "resources"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("myResources")}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {activeTab === "upload" ? (
            /* Upload Tab */
            <div className="flex flex-col items-center justify-center py-12">
              <input
                ref={fileInputRef}
                type="file"
                accept={getAcceptString()}
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                disabled={uploading}
                multiple={multiSelect}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-md border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-colors ${
                  uploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {uploading ? (
                  <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                ) : (
                  <Upload className="w-12 h-12 text-muted-foreground" />
                )}
                <div className="text-center">
                  <p className="text-foreground font-medium">
                    {uploading ? t("loading") : t("selectFile")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getUploadHint()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Resources Tab */
            <div>
              {loading && assets.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  {acceptType === "image" ? (
                    <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  ) : (
                    <Video className="w-12 h-12 text-muted-foreground mb-4" />
                  )}
                  <p className="text-foreground font-medium">
                    {acceptType === "image" ? t("noImagesFound") : t("noVideosFound")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("uploadOrGenerate")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => handleAssetClick(asset)}
                        className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                          isAssetSelected(asset)
                            ? "border-primary-500 ring-2 ring-primary-500/30"
                            : "border-transparent hover:border-primary-500"
                        }`}
                      >
                        <div className="aspect-square bg-secondary">
                          {asset.type === "image" ? (
                            <img
                              src={asset.thumbnailUrl || asset.url}
                              alt={asset.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <video
                                src={asset.url}
                                className="w-full h-full object-cover"
                                muted
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Video className="w-8 h-8 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Selected indicator for multi-select */}
                        {multiSelect && isAssetSelected(asset) && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {/* Hover overlay for single select */}
                        {!multiSelect && (
                          <div className="absolute inset-0 bg-primary-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-white text-center">
                              <Check className="w-8 h-8 mx-auto mb-1" />
                              <span className="text-sm font-medium">{t("selected")}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Load More */}
                  {hasMore && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={() => fetchAssets(false)}
                        disabled={loading}
                        className="px-6 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t("loadMore")
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer for multi-select confirm button */}
        {multiSelect && activeTab === "resources" && selectedAssets.length > 0 && (
          <div className="border-t border-border px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("selectedCount", { count: selectedAssets.length, max: remainingCount })}
            </span>
            <button
              onClick={handleConfirmSelection}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
            >
              {t("confirm")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
