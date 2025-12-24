"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  CheckSquare,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Play,
  Image,
  Settings,
} from "lucide-react";

interface Task {
  id: string;
  type: "video" | "sora2" | "nano-banana" | "gemini3-reverse" | "influencer";
  status: string;
  creditsCost: number;
  createdAt: string;
  updatedAt: string;
  details: {
    prompt?: string;
    title?: string;
    size?: string;
    duration?: string;
    quality?: string;
    resultUrl?: string;
    resultUrls?: string[];
    resultPrompt?: string;
    mode?: string;
  };
}

export default function MyTasksPage() {
  const t = useTranslations("workspace");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const fetchTasks = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const response = await fetch("/api/tasks");
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleRefresh = () => {
    fetchTasks(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "processing":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return t("pending");
      case "processing":
        return t("processing");
      case "completed":
        return t("completed");
      case "failed":
        return t("failed");
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
      case "sora2":
        return <Play className="w-4 h-4" />;
      case "nano-banana":
        return <Image className="w-4 h-4" />;
      case "gemini3-reverse":
        return <Settings className="w-4 h-4" />;
      default:
        return <CheckSquare className="w-4 h-4" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "video":
        return t("generateVideo");
      case "sora2":
        return t("sora2");
      case "nano-banana":
        return t("nanoBanana");
      case "gemini3-reverse":
        return t("gemini3Reverse");
      case "influencer":
        return t("createTask");
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const filteredTasks =
    filter === "all" ? tasks : tasks.filter((t) => t.type === filter);

  const filterOptions = [
    { value: "all", label: "全部" },
    { value: "video", label: t("generateVideo") },
    { value: "sora2", label: t("sora2") },
    { value: "nano-banana", label: t("nanoBanana") },
    { value: "gemini3-reverse", label: t("gemini3Reverse") },
  ];

  if (loading) {
    return (
      <div className="p-6 h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 h-screen">
      <div className="bg-white dark:bg-card rounded-2xl border border-border h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {t("myTasks")} ({filteredTasks.length})
          </h2>
          <div className="flex items-center gap-3">
            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
                <CheckSquare className="w-8 h-8 text-primary-400" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t("noTasks")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("createFirstTask")}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-secondary/30 dark:bg-secondary/20 rounded-xl p-4 border border-border hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                      {getTypeIcon(task.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getTypeName(task.type)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {getStatusIcon(task.status)}
                        <span className="text-xs text-muted-foreground">
                          {getStatusText(task.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {task.creditsCost > 0 && `${task.creditsCost} ${t("credits")}`}
                  </span>
                </div>

                {/* Task details */}
                <div className="text-xs text-muted-foreground space-y-1 ml-11">
                  {task.details.prompt && (
                    <p className="line-clamp-2">
                      {t("prompt")}: {task.details.prompt}
                    </p>
                  )}
                  {task.details.title && (
                    <p className="line-clamp-2">{task.details.title}</p>
                  )}
                  {task.details.size && task.details.duration && (
                    <p>
                      {task.details.size} / {task.details.duration} /{" "}
                      {task.details.quality || "sd"}
                    </p>
                  )}
                  {task.details.mode && <p>Mode: {task.details.mode}</p>}
                  <p>{formatDate(task.createdAt)}</p>
                </div>

                {/* Results */}
                {task.status === "completed" && (
                  <div className="mt-3 pt-3 border-t border-border ml-11">
                    {task.details.resultUrl && (
                      <a
                        href={task.details.resultUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        <Download className="w-3 h-3" />
                        {t("downloadResult")}
                      </a>
                    )}
                    {task.details.resultUrls &&
                      task.details.resultUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {task.details.resultUrls.map((url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                            >
                              <Download className="w-3 h-3" />
                              {t("result")} {index + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    {task.details.resultPrompt && (
                      <div className="text-xs bg-secondary/50 dark:bg-secondary/30 p-2 rounded-lg mt-2">
                        <p className="font-medium mb-1">
                          {t("generatedPrompt")}:
                        </p>
                        <p className="text-muted-foreground">
                          {task.details.resultPrompt}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
