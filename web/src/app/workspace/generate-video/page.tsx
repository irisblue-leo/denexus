"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Film, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TaskList from "@/components/workspace/TaskList";

export default function GenerateVideoPage() {
  const t = useTranslations("workspace");
  const { user, refreshUser } = useAuth();
  const [selectedSize, setSelectedSize] = useState("portrait");
  const [selectedDuration, setSelectedDuration] = useState("15s");
  const [selectedQuality, setSelectedQuality] = useState("sd");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [sellingPoints, setSellingPoints] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Calculate credits cost
  const calculateCost = () => {
    let cost = 10;
    if (selectedQuality === "hd") cost += 5;
    if (selectedDuration === "30s") cost += 5;
    if (selectedDuration === "60s") cost += 10;
    return cost;
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/tasks/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sellingPoints,
          size: selectedSize,
          duration: selectedDuration,
          quality: selectedQuality,
          language: selectedLanguage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSellingPoints("");
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
  const canSubmit = userCredits >= estimatedCost && sellingPoints.trim().length > 0;

  return (
    <div className="p-6 h-screen flex gap-6">
      {/* Left Form */}
      <div className="w-[420px] flex-shrink-0 overflow-y-auto">
        <div className="bg-white dark:bg-card rounded-2xl border border-border p-6 space-y-6">
          {/* Product Images */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <span className="text-red-500">*</span> {t("productImages")}
            </label>
            <p className="text-xs text-muted-foreground mb-3">{t("productImagesHint")}</p>
            <button className="w-24 h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary-500 hover:text-primary-500 transition-colors">
              <Plus className="w-5 h-5" />
              <span className="text-xs">{t("selectImages")}</span>
            </button>
          </div>

          {/* Reference Video */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <span className="text-red-500">*</span> {t("referenceVideo")}
            </label>
            <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary-500 transition-colors cursor-pointer">
              <Film className="w-8 h-8" />
              <span className="text-sm">{t("selectReferenceVideo")}</span>
            </div>
          </div>

          {/* Selling Points */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <span className="text-red-500">*</span> {t("sellingPoints")}
            </label>
            <p className="text-xs text-muted-foreground mb-2">{t("sellingPointsHint")}</p>
            <textarea
              value={sellingPoints}
              onChange={(e) => setSellingPoints(e.target.value)}
              placeholder={t("sellingPointsPlaceholder")}
              className="w-full h-24 px-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Generation Config */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">{t("generationConfig")}</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Size */}
              <div>
                <label className="block text-xs text-muted-foreground mb-2">{t("size")}</label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="portrait">{t("portrait")}</option>
                  <option value="landscape">{t("landscape")}</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs text-muted-foreground mb-2">{t("duration")}</label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="15s">15s</option>
                  <option value="30s">30s</option>
                  <option value="60s">60s</option>
                </select>
              </div>

              {/* Quality */}
              <div>
                <label className="block text-xs text-muted-foreground mb-2">{t("quality")}</label>
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="sd">SD</option>
                  <option value="hd">HD (+5 {t("credits")})</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs text-muted-foreground mb-2">{t("language")}</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="en">{t("english")}</option>
                  <option value="zh">{t("chinese")}</option>
                </select>
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
      <div className="flex-1 min-w-0">
        <TaskList type="video" refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
