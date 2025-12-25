"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  locale: string;
}

export default function Header({ locale }: HeaderProps) {
  const t = useTranslations();
  const { openAuthPanel, isLoggedIn } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      window.location.href = "/workspace";
    } else {
      openAuthPanel();
    }
  };

  const navItems = [
    { href: "#features", label: t("nav.features") },
    { href: "#pricing", label: t("nav.pricing") },
    { href: "#faq", label: t("nav.faq") },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? "bg-background/80 backdrop-blur-lg border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container-tight">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-white font-bold text-xs md:text-sm">D</span>
            </div>
            <span className="text-base md:text-lg font-bold text-foreground">
              Denexus
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <LanguageToggle currentLocale={locale} />
            <ThemeToggle />
            <button
              onClick={handleGetStarted}
              className="btn-primary text-sm px-4 py-2 group"
            >
              <span className="flex items-center gap-2">
                {t("common.getStarted")}
                <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          </div>

          {/* Mobile Actions - Simple, no dropdown menu */}
          <div className="flex md:hidden items-center gap-1">
            <ThemeToggle />
            <button
              onClick={handleGetStarted}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {isLoggedIn ? t("nav.workspace") : t("common.login")}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
