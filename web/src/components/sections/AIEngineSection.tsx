"use client";

import { useTranslations } from "next-intl";
import { Copy, Zap, Target, Sparkles, Play } from "lucide-react";
import { ScrollReveal } from "@/components/ui/AnimatedSection";
import { GridPattern } from "@/components/ui/AnimatedBackground";

export default function AIEngineSection() {
  const t = useTranslations("aiEngine");

  const features = [
    { icon: Copy, title: t("feature1Title"), desc: t("feature1Desc") },
    { icon: Zap, title: t("feature2Title"), desc: t("feature2Desc") },
    { icon: Target, title: t("feature3Title"), desc: t("feature3Desc") },
  ];

  return (
    <section id="features" className="section-padding relative overflow-hidden">
      {/* Enhanced background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-primary-200/20 dark:bg-primary-800/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-blob" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-200/15 dark:bg-accent-800/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 animate-blob" style={{ animationDelay: "3s" }} />
        <GridPattern className="opacity-50" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 -z-5 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-3 h-3 bg-primary-400/40 rounded-full animate-float" />
        <div className="absolute top-40 right-20 w-2 h-2 bg-accent-400/40 rounded-full animate-float-slow" />
        <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-purple-400/30 rounded-full animate-bounce-soft" />
      </div>

      <ScrollReveal className="container-tight relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="min-w-0">
            <div className="tag tag-primary mb-4 group hover:scale-105 transition-transform cursor-default">
              <Sparkles className="w-3.5 h-3.5 group-hover:animate-wiggle" />
              {t("tag")}
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
              {t("title1")}
              <br />
              <span className="gradient-text">{t("title2")}</span>
            </h2>

            <p className="text-muted-foreground mb-8">
              {t("description")}
            </p>

            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-300 group cursor-pointer hover:translate-x-2 hover:shadow-lg">
                  <div className="icon-box icon-box-primary shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="relative group">
            <div className="card-base p-6 bg-card transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
              <div className="aspect-video rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 flex items-center justify-center relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)] animate-pulse-soft" />

                {/* Animated rings */}
                <div className="absolute w-32 h-32 border border-primary-300/30 dark:border-primary-600/30 rounded-full animate-ping opacity-20" />
                <div className="absolute w-48 h-48 border border-primary-300/20 dark:border-primary-600/20 rounded-full animate-ping opacity-10" style={{ animationDelay: "0.5s" }} />

                <button className="w-16 h-16 rounded-full bg-white dark:bg-card shadow-lg flex items-center justify-center hover:scale-110 transition-transform relative z-10 group/play">
                  <Play className="w-6 h-6 text-primary-600 dark:text-primary-400 ml-1 group-hover/play:scale-110 transition-transform" fill="currentColor" />
                </button>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 bg-secondary rounded-full w-3/4 animate-pulse" />
                <div className="h-3 bg-secondary rounded-full w-1/2 animate-pulse" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -right-4 card-base px-4 py-2 flex items-center gap-2 shadow-lg animate-float">
              <div className="flex -space-x-1">
                <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: "0.3s" }} />
                <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "0.6s" }} />
              </div>
              <span className="text-xs font-medium gradient-text">AI Powered</span>
            </div>

            {/* Corner decoration */}
            <div className="absolute -top-6 -left-6 w-12 h-12 border-2 border-primary-300 dark:border-primary-700 rounded-lg rotate-12 animate-spin-slow opacity-30" />
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
