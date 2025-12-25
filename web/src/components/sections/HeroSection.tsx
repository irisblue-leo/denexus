"use client";

import { useTranslations } from "next-intl";
import { Play, Zap, Users, TrendingUp, Sparkles, LogIn } from "lucide-react";
import { ScrollReveal } from "@/components/ui/AnimatedSection";
import { HeroBackground } from "@/components/ui/AnimatedBackground";
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
      {/* Enhanced Animated Background */}
      <HeroBackground />

      {/* Additional floating elements */}
      <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none">
        {/* Animated rings */}
        <div className="absolute top-1/4 left-10 w-32 h-32 border border-primary-500/20 rounded-full animate-ping-slow" />
        <div className="absolute bottom-1/4 right-10 w-24 h-24 border border-accent-500/20 rounded-full animate-ping-slow" style={{ animationDelay: "1s" }} />

        {/* Glowing orbs */}
        <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-primary-500 rounded-full animate-glow opacity-60 blur-sm" />
        <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-accent-500 rounded-full animate-glow opacity-50 blur-sm" style={{ animationDelay: "0.5s" }} />
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-purple-500 rounded-full animate-glow opacity-40 blur-sm" style={{ animationDelay: "1s" }} />

        {/* Floating shapes */}
        <div className="absolute top-20 right-20 w-20 h-20 border-2 border-primary-500/10 rounded-xl animate-float rotate-12" />
        <div className="absolute bottom-40 left-20 w-16 h-16 border-2 border-accent-500/10 rounded-full animate-float-slow" />
        <div className="absolute top-1/2 left-10 w-12 h-12 bg-gradient-to-br from-primary-500/10 to-accent-500/10 rounded-lg animate-morph" />
      </div>

      <ScrollReveal className="container-tight relative">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 tag tag-primary mb-6 group cursor-pointer hover:scale-105 transition-transform animate-glow">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-pulse" />
            {t("badge")}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            {t("title1")}
            <br />
            <span className="gradient-text bg-[length:200%_auto] animate-gradient">{t("title2")}</span>
            <br />
            {t("title3")}
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            {t("description")}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <button
              onClick={handleGetStarted}
              className="btn-primary w-full sm:w-auto group relative overflow-hidden animate-glow"
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

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16 sm:mb-0">
            {stats.map((stat, index) => (
              <div key={index} className="card-base card-hover p-4 flex items-center gap-3 group backdrop-blur-sm bg-card/80">
                <div className="icon-box icon-box-primary group-hover:scale-110 transition-transform group-hover:animate-wiggle">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden lg:block animate-bounce-soft z-10">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2 bg-background/50 backdrop-blur-sm">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
