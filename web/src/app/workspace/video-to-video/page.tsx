"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TaskList from "@/components/workspace/TaskList";
import AssetPickerModal from "@/components/workspace/AssetPickerModal";

interface SelectedVideo {
  url: string;
  filename: string;
}

export default function VideoToVideoPage() {
  const t = useTranslations("workspace");
  const { user, refreshUser } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [textPrompt, setTextPrompt] = useState("");
  const [structureTransformation, setStructureTransformation] = useState(0.5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [polishing, setPolishing] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  // Credits cost: 5 per task
  const creditsCost = 5;

  const handleVideoSelect = (asset: { url: string; filename: string }) => {
    setSelectedVideo(asset);
    setShowAssetPicker(false);
  };

  const handlePolishPrompt = async () => {
    if (!textPrompt.trim() || polishing) return;

    setPolishing(true);
    setError("");

    try {
      const response = await fetch("/api/polish-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: textPrompt,
        }),
      });

      const data = await response.json();

      if (data.success && data.polishedPrompt) {
        setTextPrompt(data.polishedPrompt);
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
    if (!selectedVideo) {
      setError(t("videoRequired"));
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/tasks/runway", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl: selectedVideo.url,
          textPrompt: textPrompt.trim() || undefined,
          structureTransformation,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTextPrompt("");
        setSelectedVideo(null);
        setStructureTransformation(0.5);
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
  const canSubmit = userCredits >= creditsCost && selectedVideo !== null;

  return (
    <div className="p-4 md:p-6 min-h-screen flex flex-col lg:flex-row gap-4 md:gap-6">
      {/* Left Form */}
      <div className="w-full lg:w-[420px] flex-shrink-0 overflow-y-auto">
        <div className="bg-white dark:bg-card rounded-2xl border border-border p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Source Video */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <span className="text-red-500">*</span> {t("sourceVideo")}
            </label>
            <p className="text-xs text-muted-foreground mb-3">{t("sourceVideoHint")}</p>

            {selectedVideo ? (
              <div className="relative group">
                <div className="rounded-xl overflow-hidden border border-border bg-secondary/50">
                  <video
                    src={selectedVideo.url}
                    className="w-full max-h-48 object-contain"
                    controls
                  />
                </div>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  ×
                </button>
                <p className="text-xs text-muted-foreground mt-1 truncate">{selectedVideo.filename}</p>
              </div>
            ) : (
              <button
                onClick={() => setShowAssetPicker(true)}
                className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary-500 hover:text-primary-500 transition-colors cursor-pointer"
              >
                <Sparkles className="w-6 h-6" />
                <span className="text-sm">{t("selectVideo")}</span>
              </button>
            )}
          </div>

          {/* Text Prompt */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("textPromptOptional")}
            </label>
            <p className="text-xs text-muted-foreground mb-2">{t("textPromptHintRunway")}</p>
            <div className="relative">
              <textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder={t("textPromptPlaceholderRunway")}
                className="w-full h-28 px-4 py-3 pb-10 bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              {/* Polish Button */}
              <button
                onClick={handlePolishPrompt}
                disabled={!textPrompt.trim() || polishing}
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

          {/* Structure Transformation */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("structureTransformation")}
            </label>
            <p className="text-xs text-muted-foreground mb-3">{t("structureTransformationHint")}</p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={structureTransformation}
                onChange={(e) => setStructureTransformation(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <span className="text-sm font-medium text-foreground w-10 text-center">
                {structureTransformation.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{t("lowTransformation")}</span>
              <span>{t("highTransformation")}</span>
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
            {submitting ? t("submitting") : t("generate")}
          </button>
        </div>
      </div>

      {/* Right Task List */}
      <div className="flex-1 min-w-0 min-h-[400px] lg:min-h-0">
        <TaskList type="runway" refreshTrigger={refreshTrigger} />
      </div>

      {/* Asset Picker Modal */}
      <AssetPickerModal
        isOpen={showAssetPicker}
        onClose={() => setShowAssetPicker(false)}
        onSelect={handleVideoSelect}
        acceptType="video"
      />
    </div>
  );
}
