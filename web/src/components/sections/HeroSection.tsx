"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Play, Zap, Users, TrendingUp, Sparkles, LogIn } from "lucide-react";
import { AnimatedSection, AnimatedItem } from "@/components/ui/AnimatedSection";
import { useAuth } from "@/contexts/AuthContext";

export default function HeroSection() {
  const t = useTranslations("hero");
  const tc = useTranslations("common");
  const { openAuthPanel, isLoggedIn } = useAuth();

  const handleGetStarted = () => {
    if (isLoggedIn) {
      window.location.href = "/workspace";
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
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 overflow-hidden min-h-screen flex items-center">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary-400/30 dark:bg-primary-600/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-accent-400/30 dark:bg-accent-600/20 rounded-full blur-3xl animate-blob animation-delay-2000" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-400/20 dark:bg-purple-600/15 rounded-full blur-3xl animate-blob animation-delay-4000" style={{ animationDelay: "4s" }} />

        {/* Animated grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary-500 rounded-full animate-float opacity-60" />
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-accent-500 rounded-full animate-float-slow opacity-50" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-purple-500 rounded-full animate-float-delayed opacity-40" />
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce-soft opacity-50" />
      </div>

      <div className="container-tight relative">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <AnimatedSection animation="fade-down" delay={0}>
            <div className="inline-flex items-center gap-2 tag tag-primary mb-6 group cursor-pointer hover:scale-105 transition-transform">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-pulse" />
              {t("badge")}
            </div>
          </AnimatedSection>

          {/* Title */}
          <AnimatedSection animation="fade-up" delay={100}>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              {t("title1")}
              <br />
              <span className="gradient-text bg-[length:200%_auto] animate-gradient">{t("title2")}</span>
              <br />
              {t("title3")}
            </h1>
          </AnimatedSection>

          {/* Description */}
          <AnimatedSection animation="fade-up" delay={200}>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              {t("description")}
            </p>
          </AnimatedSection>

          {/* CTAs */}
          <AnimatedSection animation="fade-up" delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <button
                onClick={handleGetStarted}
                className="btn-primary w-full sm:w-auto group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {tc("getStarted")}
                  <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <a
                href="#"
                className="btn-outline w-full sm:w-auto group hover:border-primary-500 transition-colors"
              >
                <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {tc("watchDemo")}
              </a>
            </div>
          </AnimatedSection>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16 sm:mb-0">
            {stats.map((stat, index) => (
              <AnimatedItem key={index} index={index} baseDelay={150} animation="scale-in">
                <div className="card-base card-hover p-4 flex items-center gap-3 group">
                  <div className="icon-box icon-box-primary group-hover:scale-110 transition-transform">
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </AnimatedItem>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator - positioned outside container to avoid overlap */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden lg:block animate-bounce-soft z-10">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2 bg-background/50 backdrop-blur-sm">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
