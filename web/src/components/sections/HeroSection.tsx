"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Play, Zap, Users, TrendingUp, Sparkles, LogIn } from "lucide-react";
import { ScrollReveal } from "@/components/ui/AnimatedSection";
import { HeroBackground } from "@/components/ui/AnimatedBackground";
import { useAuth } from "@/contexts/AuthContext";

// Dynamically import 3D globe to avoid SSR issues
const HeroGlobe = dynamic(() => import("@/components/3d/HeroGlobe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  ),
});

export default function HeroSection() {
  const t = useTranslations("hero");
  const tc = useTranslations("common");
  const router = useRouter();
  const { openAuthPanel, isLoggedIn } = useAuth();

  const handleGetStarted = () => {
    if (isLoggedIn) {
      router.push("/workspace");
    } else {
      openAuthPanel();
    }
  };

  const stats = [
    { icon: Zap, value: t("stat1Value"), label: t("stat1Label") },
    { icon: Users, value: t("stat2Value"), label: t("stat2Label") },
    { icon: TrendingUp, value: t("stat3Value"), label: t("stat3Label") },
  ];

  return (
    <section className="relative min-h-screen flex items-center py-16 sm:py-0 overflow-hidden">
      {/* Enhanced Animated Background */}
      <HeroBackground />

      {/* 3D Globe - mobile background layer */}
      <div className="lg:hidden absolute top-1/2 left-0 right-0 h-[350px] z-0 flex items-center justify-center opacity-70">
        <HeroGlobe />
      </div>

      <div className="container-tight relative w-full z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-0 lg:gap-12 items-center">
          {/* Left side - Content */}
          <ScrollReveal className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 tag tag-primary mb-2 sm:mb-6 group cursor-pointer hover:scale-105 transition-transform">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="w-1.5 h-1.5 bg-accent-500 rounded-full" />
              {t("badge")}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight mb-2 sm:mb-6">
              {t("title1")}
              <br />
              <span className="gradient-text bg-[length:200%_auto] animate-gradient">{t("title2")}</span>
              <br />
              {t("title3")}
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-4 sm:mb-8 leading-relaxed">
              {t("description")}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-3 mb-4 sm:mb-10 relative z-20">
              <button
                onClick={handleGetStarted}
                className="btn-primary w-full sm:w-auto text-base px-6 py-3 group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {tc("getStarted")}
                  <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <a
                href="#"
                className="btn-outline w-full sm:w-auto text-base px-6 py-3 group hover:border-primary-500 transition-colors flex items-center justify-center"
              >
                <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {tc("watchDemo")}
              </a>
            </div>

            {/* Stats - horizontal row on mobile */}
            <div className="flex flex-row sm:grid sm:grid-cols-3 gap-2 sm:gap-3 overflow-x-auto relative z-20">
              {stats.map((stat, index) => (
                <div key={index} className="card-base card-hover p-2 sm:p-4 flex items-center gap-2 sm:gap-3 group backdrop-blur-sm bg-card/80 flex-shrink-0 min-w-[100px] sm:min-w-0">
                  <div className="icon-box icon-box-primary w-8 h-8 sm:w-12 sm:h-12 group-hover:scale-110 transition-transform group-hover:animate-wiggle">
                    <stat.icon className="w-3 h-3 sm:w-5 sm:h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm sm:text-xl font-bold text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {stat.value}
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

          </ScrollReveal>

          {/* Right side - 3D Globe (desktop only) */}
          <div className="hidden lg:flex w-full items-center justify-center h-[500px] xl:h-[600px]">
            <HeroGlobe />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden lg:block animate-bounce-soft z-10">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2 bg-background/50 backdrop-blur-sm">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
