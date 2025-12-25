"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Sparkles, Monitor, Smartphone, Square, Loader2, X, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TaskList from "@/components/workspace/TaskList";
import AssetPickerModal from "@/components/workspace/AssetPickerModal";

interface UploadedImage {
  url: string;
  filename: string;
}

export default function GenerateVideoPage() {
  const t = useTranslations("workspace");
  const { user, refreshUser } = useAuth();
  const [selectedSize, setSelectedSize] = useState<"portrait" | "landscape" | "square">("portrait");
  const [selectedDuration, setSelectedDuration] = useState<5 | 10>(5);
  const [selectedMode, setSelectedMode] = useState<"std" | "pro">("std");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [polishing, setPolishing] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const durationOptions = [
    { value: 5, label: "5s" },
    { value: 10, label: "10s" },
  ];

  const modeOptions = [
    { value: "std", label: t("standardMode") },
    { value: "pro", label: t("proMode") },
  ];

  // Calculate credits cost based on mode and duration
  // STD 5s: 3, STD 10s: 6
  // PRO 5s: 5, PRO 10s: 10
  const calculateCost = () => {
    if (selectedMode === "std") {
      return selectedDuration === 5 ? 3 : 6;
    } else {
      return selectedDuration === 5 ? 5 : 10;
    }
  };

  const handleAssetSelect = (asset: { url: string; filename: string }) => {
    if (uploadedImages.length >= 4) return;
    setUploadedImages((prev) => [...prev, asset]);
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePolishPrompt = async () => {
    if (!prompt.trim() || polishing) return;

    setPolishing(true);
    setError("");

    try {
      const response = await fetch("/api/polish-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          imageUrl: uploadedImages.length > 0 ? uploadedImages[0].url : undefined,
        }),
      });

      const data = await response.json();

      if (data.success && data.polishedPrompt) {
        setPrompt(data.polishedPrompt);
      } else {
        setError(data.error || t("polishFailed"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setPolishing(false);
    }
  };

  const handleSubmit = async () => {
    if (uploadedImages.length === 0) {
      setError(t("imageRequired"));
      return;
    }

    if (!prompt.trim()) {
      setError(t("promptRequired"));
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/tasks/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: uploadedImages.map((img) => img.url),
          prompt,
          aspectRatio: selectedSize,
          duration: selectedDuration,
          mode: selectedMode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPrompt("");
        setUploadedImages([]);
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
  const canSubmit = userCredits >= estimatedCost && uploadedImages.length > 0 && prompt.trim().length > 0;

  return (
    <div className="p-4 md:p-6 min-h-screen flex flex-col lg:flex-row gap-4 md:gap-6">
      {/* Left Form */}
      <div className="w-full lg:w-[420px] flex-shrink-0 overflow-y-auto">
        <div className="bg-white dark:bg-card rounded-2xl border border-border p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Product Images */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <span className="text-red-500">*</span> {t("productImages")}
            </label>
            <p className="text-xs text-muted-foreground mb-3">{t("productImagesHintMulti")}</p>

            <div className="flex flex-wrap gap-3">
              {/* Uploaded Images */}
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-border">
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Upload Button */}
              {uploadedImages.length < 4 && (
                <button
                  onClick={() => setShowAssetPicker(true)}
                  className="w-20 h-20 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary-500 hover:text-primary-500 transition-colors cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-xs">{t("selectImages")}</span>
                </button>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <span className="text-red-500">*</span> {t("prompt")}
            </label>
            <p className="text-xs text-muted-foreground mb-2">{t("promptHintMulti")}</p>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t("promptPlaceholderMulti")}
                className="w-full h-32 px-4 py-3 pb-10 bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              {/* Polish Button */}
              <button
                onClick={handlePolishPrompt}
                disabled={!prompt.trim() || polishing}
                title={t("polishPrompt")}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {polishing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                {t("polish")}
              </button>
            </div>
          </div>

          {/* Generation Config */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">{t("generationConfig")}</h3>

            {/* Aspect Ratio */}
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-2">{t("aspectRatio")}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSize("landscape")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                    selectedSize === "landscape"
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                      : "border-border hover:border-primary-300"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-xs font-medium">16:9</span>
                </button>
                <button
                  onClick={() => setSelectedSize("portrait")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                    selectedSize === "portrait"
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                      : "border-border hover:border-primary-300"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="text-xs font-medium">9:16</span>
                </button>
                <button
                  onClick={() => setSelectedSize("square")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                    selectedSize === "square"
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                      : "border-border hover:border-primary-300"
                  }`}
                >
                  <Square className="w-4 h-4" />
                  <span className="text-xs font-medium">1:1</span>
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
                    onClick={() => setSelectedDuration(option.value as 5 | 10)}
                    className={`flex-1 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
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

            {/* Mode */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">{t("generationMode")}</label>
              <div className="flex gap-2">
                {modeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedMode(option.value as "std" | "pro")}
                    className={`flex-1 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      selectedMode === option.value
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                        : "border-border hover:border-primary-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
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
      <div className="flex-1 min-w-0 min-h-[400px] lg:min-h-0">
        <TaskList type="video" refreshTrigger={refreshTrigger} />
      </div>

      {/* Asset Picker Modal */}
      <AssetPickerModal
        isOpen={showAssetPicker}
        onClose={() => setShowAssetPicker(false)}
        onSelect={handleAssetSelect}
        acceptType="image"
        multiSelect={true}
        maxCount={4}
        currentCount={uploadedImages.length}
      />
    </div>
  );
}
