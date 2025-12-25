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
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Square,
  CheckSquare,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface TaskListProps {
  type: "video" | "sora2" | "nano-banana" | "gemini3-reverse" | "runway";
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
  duration_seconds?: number | null;
}

const ITEMS_PER_PAGE = 20;

export default function TaskList({ type, refreshTrigger }: TaskListProps) {
  const t = useTranslations("workspace");
  const tc = useTranslations("common");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string> | "all">("all");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const apiEndpoint = `/api/tasks/${type}`;

  const fetchTasks = useCallback(async (showRefreshing = false, page = currentPage) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const response = await fetch(`${apiEndpoint}?page=${page}&limit=${ITEMS_PER_PAGE}`);
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
        if (data.total !== undefined) {
          setTotalCount(data.total);
        } else {
          setTotalCount(data.tasks.length);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiEndpoint, currentPage]);

  // Initial fetch and refresh trigger
  useEffect(() => {
    fetchTasks(false, currentPage);
  }, [fetchTasks, refreshTrigger, currentPage]);

  // Auto-refresh when there are pending/processing tasks
  useEffect(() => {
    const hasPendingTasks = tasks.some(
      (task) => task.status === "pending" || task.status === "processing"
    );

    if (hasPendingTasks) {
      // Start auto-refresh every 3 seconds
      autoRefreshRef.current = setInterval(() => {
        fetchTasks(false, currentPage);
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
  }, [tasks, fetchTasks, currentPage]);

  const handleRefresh = () => {
    fetchTasks(true, currentPage);
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      // If "all" is set, convert to a Set with all tasks except this one (collapse it)
      if (prev === "all") {
        const newSet = new Set(tasks.map(t => t.id));
        newSet.delete(taskId);
        return newSet;
      }
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const isExpanded = (taskId: string) => {
    if (expandedTasks === "all") return true;
    return expandedTasks.has(taskId);
  };

  const toggleSelect = (taskId: string) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map((t) => t.id)));
    }
  };

  const handleDelete = async (taskId: string) => {
    const confirmed = await confirm({
      title: t("deleteTask"),
      message: t("confirmDeleteTask"),
      confirmText: tc("confirm"),
      cancelText: tc("cancel"),
      variant: "danger",
    });

    if (!confirmed) return;

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
        setSelectedTasks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        setTotalCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedTasks.size === 0) return;

    const confirmed = await confirm({
      title: t("batchDelete"),
      message: t("confirmBatchDelete", { count: selectedTasks.size }),
      confirmText: tc("confirm"),
      cancelText: tc("cancel"),
      variant: "danger",
    });

    if (!confirmed) return;

    setBatchDeleting(true);
    try {
      const response = await fetch(`${apiEndpoint}/batch`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskIds: Array.from(selectedTasks) }),
      });

      const data = await response.json();
      if (data.success) {
        setTasks((prev) => prev.filter((task) => !selectedTasks.has(task.id)));
        setTotalCount((prev) => Math.max(0, prev - selectedTasks.size));
        setSelectedTasks(new Set());
      }
    } catch (error) {
      console.error("Failed to batch delete tasks:", error);
    } finally {
      setBatchDeleting(false);
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

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
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
      case "runway":
        return {
          icon: Play,
          title: t("noTasks"),
          description: t("createFirstRunway"),
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
    <>
    {ConfirmDialog}
    <div className="bg-white dark:bg-card rounded-2xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border gap-2 sm:gap-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            {listTitle} {totalCount > 0 && `(${totalCount})`}
          </h2>
          {tasks.some((t) => t.status === "pending" || t.status === "processing") && (
            <span className="text-xs text-muted-foreground animate-pulse hidden sm:inline">
              {t("autoRefreshing")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedTasks.size > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={batchDeleting}
              className="px-2 sm:px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {batchDeleting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{t("batchDelete")}</span> ({selectedTasks.size})
            </button>
          )}
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

      {/* Select All */}
      {tasks.length > 0 && (
        <div className="px-4 sm:px-6 py-2 border-b border-border bg-secondary/20">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {selectedTasks.size === tasks.length ? (
              <CheckSquare className="w-4 h-4 text-primary-500" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {selectedTasks.size === tasks.length ? t("deselectAll") : t("selectAll")}
          </button>
        </div>
      )}

      {/* Content */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="text-center">
            <div className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-3 sm:mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-xl sm:rounded-2xl flex items-center justify-center">
              <Icon className="w-6 sm:w-8 h-6 sm:h-8 text-primary-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
              {emptyState.title}
            </h3>
            <p className="text-xs sm:text-sm text-primary-600 dark:text-primary-400">
              {emptyState.description}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {tasks.map((task) => {
            const taskExpanded = isExpanded(task.id);
            const isSelected = selectedTasks.has(task.id);

            return (
              <div
                key={task.id}
                className={`bg-secondary/30 dark:bg-secondary/20 rounded-xl border transition-colors ${
                  isSelected
                    ? "border-primary-500 bg-primary-50/50 dark:bg-primary-900/20"
                    : "border-border hover:border-primary-300 dark:hover:border-primary-600"
                }`}
              >
                {/* Collapsed Header */}
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(task.id)}
                    className="flex-shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary-500" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground hover:text-primary-500" />
                    )}
                  </button>

                  {/* Expand/Collapse Toggle */}
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="flex-shrink-0"
                  >
                    {taskExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Status */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {getStatusIcon(task.status)}
                    <span className="text-xs font-medium text-foreground">
                      {getStatusText(task.status)}
                    </span>
                    {task.status === "completed" && task.duration_seconds && (
                      <span className="text-xs text-muted-foreground">
                        ({formatDuration(task.duration_seconds)})
                      </span>
                    )}
                  </div>

                  {/* Prompt Preview */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      {task.prompt || task.mode || "-"}
                    </p>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                    {formatDate(task.created_at)}
                  </span>

                  {/* Credits */}
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {task.credits_cost} {t("credits")}
                  </span>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(task.id)}
                    disabled={deleting === task.id}
                    className="flex-shrink-0 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                    title={t("deleteTask")}
                  >
                    {deleting === task.id ? (
                      <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </button>
                </div>

                {/* Expanded Content */}
                {taskExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border mt-0">
                    {/* Task details */}
                    <div className="text-xs text-muted-foreground space-y-1 mt-3">
                      {task.prompt && (
                        <p>
                          <span className="font-medium">{t("prompt")}:</span> {task.prompt}
                        </p>
                      )}
                      {task.size && task.duration && (
                        <p>
                          <span className="font-medium">{t("settings")}:</span> {task.size} / {task.duration} / {task.quality || "sd"}
                        </p>
                      )}
                      {task.mode && (
                        <p>
                          <span className="font-medium">Mode:</span> {task.mode}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">{t("createdAt")}:</span> {formatDate(task.created_at)}
                      </p>
                    </div>

                    {/* Error message */}
                    {task.status === "failed" && task.error_message && (
                      <div className="mt-3 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                        {task.error_message}
                      </div>
                    )}

                    {/* Results */}
                    {task.status === "completed" && (
                      <div className="mt-3 pt-3 border-t border-border">
                        {/* Single result URL */}
                        {task.result_url && (
                          <div className="space-y-2">
                            {isVideoUrl(task.result_url) ? (
                              <div className="relative rounded-lg overflow-hidden bg-secondary/50">
                                <video
                                  src={task.result_url}
                                  controls
                                  className="w-full max-h-64 object-contain"
                                  preload="metadata"
                                />
                              </div>
                            ) : isImageUrl(task.result_url) ? (
                              <div className="relative rounded-lg overflow-hidden bg-secondary/50">
                                <img
                                  src={task.result_url}
                                  alt="Generated result"
                                  className="w-full max-h-64 object-contain"
                                />
                              </div>
                            ) : null}
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
                            <p className="text-muted-foreground whitespace-pre-wrap">{task.result_prompt}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Processing indicator */}
                    {task.status === "processing" && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 text-xs text-blue-500">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>
                            {type === "video" || type === "sora2" || type === "runway"
                              ? t("generatingVideo")
                              : type === "gemini3-reverse"
                              ? t("generatingPrompt")
                              : t("generatingImage")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 sm:px-6 py-3 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {currentPage} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
