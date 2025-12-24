"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Film, Image, Sparkles, Loader2, Upload, Link, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TaskList from "@/components/workspace/TaskList";

export default function Gemini3ReversePage() {
  const t = useTranslations("workspace");
  const { user, refreshUser } = useAuth();
  const [reverseMode, setReverseMode] = useState<"video" | "image">("video");
  const [inputMode, setInputMode] = useState<"url" | "upload">("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ url: string; filename: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const creditsCost = 2;

  const handleFileUpload = useCallback(async (file: File) => {
    // Validate file type
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (reverseMode === "video" && !isVideo) {
      setError(t("invalidFileType"));
      return;
    }
    if (reverseMode === "image" && !isImage) {
      setError(t("invalidFileType"));
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError(t("fileTooLarge"));
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadedFile({
          url: data.url,
          filename: data.filename,
        });
      } else {
        setError(data.error || t("uploadFailed"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setUploading(false);
    }
  }, [reverseMode, t]);

  const removeUploadedFile = () => {
    setUploadedFile(null);
  };

  const handleSubmit = async () => {
    const finalUrl = inputMode === "upload" ? uploadedFile?.url : sourceUrl.trim();

    if (!finalUrl) {
      setError(t("sourceUrlRequired"));
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/tasks/gemini3-reverse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: reverseMode,
          sourceUrl: finalUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSourceUrl("");
        setUploadedFile(null);
        setRefreshTrigger((prev) => prev + 1);
        refreshUser();
      } else {
        setError(data.error || t("submitFailed"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSubmitting(false);
    }
  };

  const userCredits = user?.credits ?? 0;
  const hasSource = inputMode === "upload" ? !!uploadedFile : sourceUrl.trim().length > 0;
  const canSubmit = userCredits >= creditsCost && hasSource;

  return (
    <div className="p-6 h-screen flex gap-6">
      {/* Left Form */}
      <div className="w-[420px] flex-shrink-0 overflow-y-auto">
        <div className="bg-white dark:bg-card rounded-2xl border border-border p-6 space-y-6">
          {/* Reverse Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              {t("reverseMode")}
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setReverseMode("video");
                  setUploadedFile(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  reverseMode === "video"
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                    : "border-border hover:border-primary-300"
                }`}
              >
                <Film className="w-4 h-4" />
                <span className="text-sm font-medium">{t("videoReverse")}</span>
              </button>
              <button
                onClick={() => {
                  setReverseMode("image");
                  setUploadedFile(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  reverseMode === "image"
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                    : "border-border hover:border-primary-300"
                }`}
              >
                <Image className="w-4 h-4" />
                <span className="text-sm font-medium">{t("imageReverse")}</span>
              </button>
            </div>
          </div>

          {/* Input Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              {t("inputMethod")}
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setInputMode("url")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  inputMode === "url"
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                    : "border-border hover:border-primary-300"
                }`}
              >
                <Link className="w-4 h-4" />
                <span className="text-sm font-medium">{t("urlInput")}</span>
              </button>
              <button
                onClick={() => setInputMode("upload")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  inputMode === "upload"
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                    : "border-border hover:border-primary-300"
                }`}
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">{t("fileUpload")}</span>
              </button>
            </div>
          </div>

          {/* Source Input */}
          {inputMode === "url" ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <span className="text-red-500">*</span>{" "}
                {reverseMode === "video" ? t("videoUrl") : t("imageUrl")}
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                {reverseMode === "video" ? t("videoUrlHint") : t("imageUrlHint")}
              </p>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={reverseMode === "video" ? "https://example.com/video.mp4" : "https://example.com/image.jpg"}
                className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <span className="text-red-500">*</span>{" "}
                {reverseMode === "video" ? t("uploadVideo") : t("uploadImage")}
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                {reverseMode === "video" ? t("uploadVideoHint") : t("uploadImageHint")}
              </p>

              {uploadedFile ? (
                <div className="relative border border-border rounded-xl p-4 bg-secondary/30">
                  <div className="flex items-center gap-3">
                    {reverseMode === "video" ? (
                      <Film className="w-8 h-8 text-primary-500" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg overflow-hidden">
                        <img
                          src={uploadedFile.url}
                          alt={uploadedFile.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {uploadedFile.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("uploadSuccess")}</p>
                    </div>
                    <button
                      onClick={removeUploadedFile}
                      className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary-500 transition-colors">
                  <input
                    type="file"
                    accept={reverseMode === "video" ? "video/*" : "image/*"}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        {t("selectFile")}
                      </span>
                    </>
                  )}
                </label>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Credits Info */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("estimatedCost")}</span>
              <span className="font-semibold text-foreground">{creditsCost} {t("credits")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("remainingCredits")}</span>
              <span className={`font-semibold ${userCredits >= creditsCost ? "text-primary-600 dark:text-primary-400" : "text-red-500"}`}>
                {userCredits} {t("credits")}
              </span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {submitting ? t("submitting") : t("startReverse")}
          </button>
        </div>
      </div>

      {/* Right Task List */}
      <div className="flex-1 min-w-0">
        <TaskList type="gemini3-reverse" refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
