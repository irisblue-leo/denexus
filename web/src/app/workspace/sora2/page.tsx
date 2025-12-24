"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Sparkles, Monitor, Smartphone, Loader2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TaskList from "@/components/workspace/TaskList";

interface UploadedImage {
  url: string;
  filename: string;
}

export default function Sora2Page() {
  const t = useTranslations("workspace");
  const { user, refreshUser } = useAuth();
  const [selectedSize, setSelectedSize] = useState("portrait");
  const [selectedDuration, setSelectedDuration] = useState("10s");
  const [selectedQuality, setSelectedQuality] = useState("sd");
  const [quantity, setQuantity] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [uploading, setUploading] = useState(false);

  const durationOptions = [
    { value: "5s", label: "5s" },
    { value: "10s", label: "10s" },
    { value: "15s", label: "15s" },
    { value: "20s", label: "20s" },
  ];

  const qualityOptions = [
    { value: "sd", label: t("standardDef") },
    { value: "hd", label: t("highDef") },
  ];

  // Calculate credits cost matching API logic
  const calculateCost = () => {
    // sora-2: 5 credits base, sora-2-pro: 50 credits base
    let baseCost = selectedQuality === "hd" ? 50 : 5;
    // Duration adjustments
    if (selectedDuration === "15s") baseCost = Math.round(baseCost * 1.5);
    if (selectedDuration === "20s") baseCost = Math.round(baseCost * 2);
    return baseCost * quantity;
  };

  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError(t("invalidFileType"));
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
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
        setUploadedImage({
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
  }, [t]);

  const removeImage = () => {
    setUploadedImage(null);
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError(t("promptRequired"));
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/tasks/sora2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          size: selectedSize,
          duration: selectedDuration,
          quality: selectedQuality,
          quantity,
          productImage: uploadedImage?.url,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPrompt("");
        setUploadedImage(null);
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

  const estimatedCost = calculateCost();
  const userCredits = user?.credits ?? 0;
  const canSubmit = userCredits >= estimatedCost && prompt.trim().length > 0;

  return (
    <div className="p-6 h-screen flex gap-6">
      {/* Left Form */}
      <div className="w-[420px] flex-shrink-0 overflow-y-auto">
        <div className="bg-white dark:bg-card rounded-2xl border border-border p-6 space-y-6">
          {/* Product Images */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("productImages")}
            </label>
            <p className="text-xs text-muted-foreground mb-3">{t("productImagesHintSora2")}</p>

            <div className="flex flex-wrap gap-3">
              {/* Uploaded Image */}
              {uploadedImage && (
                <div className="relative group">
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-border">
                    <img
                      src={uploadedImage.url}
                      alt={uploadedImage.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Upload Button */}
              {!uploadedImage && (
                <label className="w-24 h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary-500 hover:text-primary-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span className="text-xs">{t("selectImages")}</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <span className="text-red-500">*</span> {t("prompt")}
            </label>
            <p className="text-xs text-muted-foreground mb-2">{t("promptHint")}</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("promptPlaceholder")}
              className="w-full h-32 px-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Generation Config */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">{t("generationConfig")}</h3>

            {/* Size */}
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-2">{t("size")}</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedSize("landscape")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedSize === "landscape"
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                      : "border-border hover:border-primary-300"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-sm font-medium">{t("landscape")}</span>
                </button>
                <button
                  onClick={() => setSelectedSize("portrait")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedSize === "portrait"
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                      : "border-border hover:border-primary-300"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="text-sm font-medium">{t("portrait")}</span>
                </button>
              </div>
            </div>

            {/* Duration */}
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-2">{t("duration")}</label>
              <div className="flex gap-2">
                {durationOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDuration(option.value)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      selectedDuration === option.value
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                        : "border-border hover:border-primary-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-2">{t("quality")}</label>
              <div className="flex gap-2">
                {qualityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedQuality(option.value)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      selectedQuality === option.value
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                        : "border-border hover:border-primary-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">{t("quantity")}</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                min={1}
                max={10}
                className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

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
              <span className="font-semibold text-foreground">{estimatedCost} {t("credits")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("remainingCredits")}</span>
              <span className={`font-semibold ${userCredits >= estimatedCost ? "text-primary-600 dark:text-primary-400" : "text-red-500"}`}>
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
            {submitting ? t("submitting") : t("generate")}
          </button>
        </div>
      </div>

      {/* Right Task List */}
      <div className="flex-1 min-w-0">
        <TaskList type="sora2" refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
