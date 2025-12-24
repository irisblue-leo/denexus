"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  RefreshCw,
  Play,
  Image as ImageIcon,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  ExternalLink,
  Trash2,
} from "lucide-react";

interface TaskListProps {
  type: "video" | "sora2" | "nano-banana" | "gemini3-reverse";
  refreshTrigger?: number;
}

interface Task {
  id: string;
  status: string;
  credits_cost: number;
  created_at: string;
  updated_at: string;
  result_url?: string;
  result_urls?: string[];
  result_prompt?: string;
  prompt?: string;
  size?: string;
  duration?: string;
  quality?: string;
  mode?: string;
  error_message?: string;
}

export default function TaskList({ type, refreshTrigger }: TaskListProps) {
  const t = useTranslations("workspace");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const apiEndpoint = `/api/tasks/${type}`;

  const fetchTasks = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const response = await fetch(apiEndpoint);
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
  }, [apiEndpoint]);

  // Initial fetch and refresh trigger
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshTrigger]);

  // Auto-refresh when there are pending/processing tasks
  useEffect(() => {
    const hasPendingTasks = tasks.some(
      (task) => task.status === "pending" || task.status === "processing"
    );

    if (hasPendingTasks) {
      // Start auto-refresh every 3 seconds
      autoRefreshRef.current = setInterval(() => {
        fetchTasks(false);
      }, 3000);
    } else {
      // Stop auto-refresh
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [tasks, fetchTasks]);

  const handleRefresh = () => {
    fetchTasks(true);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm(t("confirmDeleteTask"))) return;

    setDeleting(taskId);
    try {
      const response = await fetch(apiEndpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId }),
      });

      const data = await response.json();
      if (data.success) {
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getEmptyState = () => {
    switch (type) {
      case "video":
        return {
          icon: Play,
          title: t("noTasks"),
          description: t("createFirstTask"),
        };
      case "sora2":
        return {
          icon: Play,
          title: t("noTasks"),
          description: t("createFirstSora2"),
        };
      case "nano-banana":
        return {
          icon: ImageIcon,
          title: t("noTasks"),
          description: t("createFirstNanoBanana"),
        };
      case "gemini3-reverse":
        return {
          icon: Settings,
          title: t("noReverseRecords"),
          description: t("uploadToReverse"),
        };
      default:
        return {
          icon: Play,
          title: t("noTasks"),
          description: t("createFirstTask"),
        };
    }
  };

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.startsWith("data:image/");
  };

  const isVideoUrl = (url: string) => {
    return /\.(mp4|webm|mov|avi|mkv)$/i.test(url);
  };

  const emptyState = getEmptyState();
  const Icon = emptyState.icon;
  const listTitle =
    type === "gemini3-reverse" ? t("reverseRecords") : t("taskList");

  if (loading) {
    return (
      <div className="bg-white dark:bg-card rounded-2xl border border-border h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            {listTitle} {tasks.length > 0 && `(${tasks.length})`}
          </h2>
          {tasks.some((t) => t.status === "pending" || t.status === "processing") && (
            <span className="text-xs text-muted-foreground animate-pulse">
              {t("autoRefreshing")}
            </span>
          )}
        </div>
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

      {/* Content */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {emptyState.title}
            </h3>
            <p className="text-sm text-primary-600 dark:text-primary-400">
              {emptyState.description}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-secondary/30 dark:bg-secondary/20 rounded-xl p-4 border border-border hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(task.status)}
                  <span className="text-sm font-medium text-foreground">
                    {getStatusText(task.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {task.credits_cost} {t("credits")}
                  </span>
                  <button
                    onClick={() => handleDelete(task.id)}
                    disabled={deleting === task.id}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                    title={t("deleteTask")}
                  >
                    {deleting === task.id ? (
                      <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Task details */}
              <div className="text-xs text-muted-foreground space-y-1">
                {task.prompt && (
                  <p className="line-clamp-2">
                    {t("prompt")}: {task.prompt}
                  </p>
                )}
                {task.size && task.duration && (
                  <p>
                    {task.size} / {task.duration} / {task.quality || "sd"}
                  </p>
                )}
                {task.mode && <p>Mode: {task.mode}</p>}
                <p>{formatDate(task.created_at)}</p>
              </div>

              {/* Error message */}
              {task.status === "failed" && task.error_message && (
                <div className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                  {task.error_message}
                </div>
              )}

              {/* Results */}
              {task.status === "completed" && (
                <div className="mt-3 pt-3 border-t border-border">
                  {/* Single result URL */}
                  {task.result_url && (
                    <div className="space-y-2">
                      {isImageUrl(task.result_url) && (
                        <div className="relative rounded-lg overflow-hidden bg-secondary/50">
                          <img
                            src={task.result_url}
                            alt="Generated result"
                            className="w-full max-h-64 object-contain"
                          />
                        </div>
                      )}
                      <a
                        href={task.result_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        <Download className="w-3 h-3" />
                        {t("downloadResult")}
                      </a>
                    </div>
                  )}

                  {/* Multiple result URLs (for nano-banana and sora2) */}
                  {task.result_urls && task.result_urls.length > 0 && (
                    <div className="space-y-3">
                      {/* Media grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {task.result_urls.map((url, index) => (
                          <div key={index} className="relative group">
                            {isVideoUrl(url) ? (
                              <div className="relative rounded-lg overflow-hidden bg-secondary/50 aspect-video">
                                <video
                                  src={url}
                                  controls
                                  className="w-full h-full object-contain"
                                  preload="metadata"
                                />
                              </div>
                            ) : isImageUrl(url) ? (
                              <div className="relative rounded-lg overflow-hidden bg-secondary/50 aspect-square">
                                <img
                                  src={url}
                                  alt={`Generated result ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4 text-white" />
                                  </a>
                                  <a
                                    href={url}
                                    download
                                    className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
                                  >
                                    <Download className="w-4 h-4 text-white" />
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                              >
                                <Download className="w-3 h-3" />
                                {t("result")} {index + 1}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generated prompt (for reverse tasks) */}
                  {task.result_prompt && (
                    <div className="text-xs bg-secondary/50 dark:bg-secondary/30 p-2 rounded-lg mt-2">
                      <p className="font-medium mb-1">{t("generatedPrompt")}:</p>
                      <p className="text-muted-foreground">{task.result_prompt}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Processing indicator */}
              {task.status === "processing" && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-blue-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{t("generatingImage")}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
