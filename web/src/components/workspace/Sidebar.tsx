"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import {
  Video,
  Sparkles,
  Image,
  Lightbulb,
  Users,
  CheckSquare,
  Headphones,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  User,
  MoreVertical,
  Sun,
  Moon,
  Globe,
  Settings,
  LogOut,
  FolderOpen,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";
import { type Locale } from "@/i18n/config";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  isCollapsed: boolean;
  isMobile?: boolean;
  isMobileMenuOpen?: boolean;
  onToggle: () => void;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  isCollapsed,
  isMobile = false,
  isMobileMenuOpen = false,
  onToggle,
  onCloseMobile,
}: SidebarProps) {
  const t = useTranslations("workspace");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const mobileThemeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const switchLocale = (newLocale: Locale) => {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    router.refresh();
  };

  const toggleTheme = useCallback(async (buttonRef?: React.RefObject<HTMLButtonElement | null>) => {
    const newTheme = theme === "dark" ? "light" : "dark";
    const ref = buttonRef?.current || themeButtonRef.current;

    // Check if View Transitions API is supported
    if (
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      ref
    ) {
      // Get button position for the transition origin
      const rect = ref.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      // Calculate the maximum radius needed to cover the entire screen
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      // Set CSS custom properties for the transition
      document.documentElement.style.setProperty("--theme-toggle-x", `${x}px`);
      document.documentElement.style.setProperty("--theme-toggle-y", `${y}px`);
      document.documentElement.style.setProperty("--theme-toggle-radius", `${maxRadius}px`);

      // Start view transition
      const transition = (document as Document & { startViewTransition: (callback: () => void) => { ready: Promise<void> } }).startViewTransition(() => {
        setTheme(newTheme);
      });
      await transition.ready;
    } else {
      // Fallback for browsers without View Transitions API
      setTheme(newTheme);
    }
  }, [theme, setTheme]);

  const toggleLocale = () => {
    const nextLocale = locale === "zh" ? "en" : "zh";
    switchLocale(nextLocale as Locale);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  const handleNavClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const displayName = user?.phone || user?.email || "User";
  const truncatedName = displayName.length > 11 ? displayName.slice(0, 11) + "..." : displayName;

  const aiVideoItems = [
    { href: "/workspace/generate-video", icon: Video, label: t("generateVideo"), hoverClass: "group-hover:animate-wiggle" },
    { href: "/workspace/video-to-video", icon: RefreshCw, label: t("videoToVideo"), hoverClass: "group-hover:animate-spin-once" },
    { href: "/workspace/sora2", icon: Sparkles, label: t("sora2"), hoverClass: "group-hover:animate-pulse-scale" },
    { href: "/workspace/nano-banana", icon: Image, label: t("nanoBanana"), hoverClass: "group-hover:animate-bounce-small" },
    { href: "/workspace/gemini3-reverse", icon: Lightbulb, label: t("gemini3Reverse"), hoverClass: "group-hover:animate-glow-pulse" },
  ];

  const influencerItems = [
    { href: "/workspace/create-task", icon: Users, label: t("createTask"), hoverClass: "group-hover:animate-wiggle" },
    { href: "/workspace/my-tasks", icon: CheckSquare, label: t("myTasks"), hoverClass: "group-hover:animate-check" },
  ];

  const isActive = (href: string) => pathname === href;

  // Mobile: Fixed header with menu button
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-card border-b border-border flex items-center justify-between px-4 z-40">
          <button
            onClick={onToggle}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">D</span>
            </div>
            <span className="text-base font-bold gradient-text">Denexus</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {user?.credits ?? 0} {t("credits")}
            </span>
          </div>
        </header>

        {/* Mobile Sidebar Drawer */}
        <aside
          className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-card border-r border-border flex flex-col z-50 transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-border">
            <Link href="/" className="flex items-center gap-2" onClick={handleNavClick}>
              <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">D</span>
              </div>
              <span className="text-base font-bold gradient-text">Denexus</span>
            </Link>
            <button
              onClick={onCloseMobile}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {/* AI Video Section */}
            <div className="mb-6">
              <div className="px-4 mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("aiVideo")}
                </span>
              </div>
              <ul className="space-y-1 px-2">
                {aiVideoItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleNavClick}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isActive(item.href)
                          ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform ${item.hoverClass} ${isActive(item.href) ? "text-primary-600 dark:text-primary-400" : ""}`} />
                      <span className="text-sm font-medium truncate">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Influencer Section */}
            <div className="mb-6">
              <div className="px-4 mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("influencerCooperation")}
                </span>
              </div>
              <ul className="space-y-1 px-2">
                {influencerItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleNavClick}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isActive(item.href)
                          ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform ${item.hoverClass} ${isActive(item.href) ? "text-primary-600 dark:text-primary-400" : ""}`} />
                      <span className="text-sm font-medium truncate">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="border-t border-border p-2 space-y-1">
            <Link
              href="/workspace/assets"
              onClick={handleNavClick}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full ${
                isActive("/workspace/assets")
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              <FolderOpen className="w-5 h-5 flex-shrink-0 transition-transform group-hover:animate-bounce-small" />
              <span className="text-sm font-medium">{t("assets")}</span>
            </Link>

            <button className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground hover:bg-secondary transition-all w-full">
              <Headphones className="w-5 h-5 flex-shrink-0 transition-transform group-hover:animate-wiggle" />
              <span className="text-sm font-medium">{t("contactUs")}</span>
            </button>

            <Link
              href="/workspace/buy"
              onClick={handleNavClick}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full ${
                isActive("/workspace/buy")
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              <ShoppingCart className="w-5 h-5 flex-shrink-0 transition-transform group-hover:animate-bounce-small" />
              <span className="text-sm font-medium">{t("buyNow")}</span>
            </Link>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                ref={mobileThemeButtonRef}
                onClick={() => toggleTheme(mobileThemeButtonRef)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="w-4 h-4 text-muted-foreground animate-theme-icon" />
                ) : (
                  <Moon className="w-4 h-4 text-muted-foreground animate-theme-icon" />
                )}
              </button>
              <button
                onClick={toggleLocale}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <Globe className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-500" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 px-3 py-2 bg-secondary/50 rounded-xl">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{truncatedName}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.credits ?? 0} {t("credits")}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Spacer for fixed header */}
        <div className="h-14" />
      </>
    );
  }

  // Desktop Sidebar
  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white dark:bg-card border-r border-border flex flex-col transition-all duration-300 z-40 ${
        isCollapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="text-lg font-bold gradient-text">Denexus</span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/" className="mx-auto">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
          </Link>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-card border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-secondary transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* AI Video Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <div className="px-4 mb-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("aiVideo")}
              </span>
            </div>
          )}
          <ul className="space-y-1 px-2">
            {aiVideoItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive(item.href)
                      ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                      : "text-foreground hover:bg-secondary"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform ${item.hoverClass} ${isActive(item.href) ? "text-primary-600 dark:text-primary-400" : ""}`} />
                  {!isCollapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Influencer Cooperation Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <div className="px-4 mb-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t("influencerCooperation")}
              </span>
            </div>
          )}
          <ul className="space-y-1 px-2">
            {influencerItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive(item.href)
                      ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                      : "text-foreground hover:bg-secondary"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform ${item.hoverClass} ${isActive(item.href) ? "text-primary-600 dark:text-primary-400" : ""}`} />
                  {!isCollapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border p-2 space-y-1">
        {/* My Assets */}
        <Link
          href="/workspace/assets"
          className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full ${
            isActive("/workspace/assets")
              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
              : "text-foreground hover:bg-secondary"
          } ${isCollapsed ? "justify-center" : ""}`}
          title={isCollapsed ? t("assets") : undefined}
        >
          <FolderOpen className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:animate-bounce-small ${isActive("/workspace/assets") ? "text-primary-600 dark:text-primary-400" : ""}`} />
          {!isCollapsed && <span className="text-sm font-medium">{t("assets")}</span>}
        </Link>

        {/* Contact Us */}
        <button
          className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground hover:bg-secondary transition-all w-full ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? t("contactUs") : undefined}
        >
          <Headphones className="w-5 h-5 flex-shrink-0 transition-transform group-hover:animate-wiggle" />
          {!isCollapsed && <span className="text-sm font-medium">{t("contactUs")}</span>}
        </button>

        {/* Buy Now */}
        <Link
          href="/workspace/buy"
          className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full ${
            isActive("/workspace/buy")
              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
              : "text-foreground hover:bg-secondary"
          } ${isCollapsed ? "justify-center" : ""}`}
          title={isCollapsed ? t("buyNow") : undefined}
        >
          <ShoppingCart className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:animate-bounce-small ${isActive("/workspace/buy") ? "text-primary-600 dark:text-primary-400" : ""}`} />
          {!isCollapsed && <span className="text-sm font-medium">{t("buyNow")}</span>}
        </Link>

        {/* User Profile with Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all w-full ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground truncate">{truncatedName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("remainingCredits")}: <span className="text-primary-600 dark:text-primary-400">{user?.credits ?? 0}</span>
                  </p>
                </div>
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </>
            )}
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />

              {/* Menu */}
              <div
                className={`absolute z-50 bg-white dark:bg-card border border-border rounded-xl shadow-lg py-2 min-w-[200px] ${
                  isCollapsed ? "left-full ml-2 bottom-0" : "bottom-full mb-2 left-0 right-0"
                }`}
              >
                {/* Theme Toggle */}
                <button
                  ref={themeButtonRef}
                  onClick={() => {
                    toggleTheme(themeButtonRef);
                    setShowUserMenu(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-secondary transition-colors"
                >
                  {mounted && theme === "dark" ? (
                    <Sun className="w-4 h-4 text-muted-foreground animate-theme-icon" />
                  ) : (
                    <Moon className="w-4 h-4 text-muted-foreground animate-theme-icon" />
                  )}
                  <span className="text-sm text-foreground">
                    {mounted && theme === "dark" ? t("lightMode") : t("darkMode")}
                  </span>
                </button>

                {/* Language Toggle */}
                <button
                  onClick={() => {
                    toggleLocale();
                    setShowUserMenu(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-secondary transition-colors"
                >
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {locale === "zh" ? "English" : "中文"}
                  </span>
                </button>

                <div className="border-t border-border my-1" />

                {/* Settings */}
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-secondary transition-colors"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{t("settings")}</span>
                </button>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-secondary transition-colors text-red-500"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">{t("logout")}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
