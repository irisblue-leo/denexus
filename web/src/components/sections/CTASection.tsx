"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

export default function CTASection() {
  const t = useTranslations("cta");

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-purple-600 to-accent-600 dark:from-primary-700 dark:via-purple-700 dark:to-accent-700 bg-[length:200%_100%] animate-gradient" />

      {/* Overlay patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(0,0,0,0.1),transparent_50%)]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '4rem 4rem',
        }}
      />

      {/* Floating elements */}
      <div className="absolute top-10 left-10 w-20 h-20 border border-white/20 rounded-full animate-float" />
      <div className="absolute bottom-10 right-10 w-16 h-16 border border-white/20 rounded-lg rotate-45 animate-float-slow" />
      <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-white/10 rounded-full animate-bounce-soft blur-sm" />
      <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-white/10 rounded-full animate-bounce-soft blur-sm" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-1/4 left-1/3 w-4 h-4 bg-white/15 rounded-full animate-float" style={{ animationDelay: "2s" }} />

      {/* Animated rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full animate-ping-slow opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/10 rounded-full animate-ping-slow opacity-30" style={{ animationDelay: "1s" }} />

      {/* Sparkle decorations */}
      <Sparkles className="absolute top-8 right-1/4 w-6 h-6 text-white/30 animate-pulse" />
      <Sparkles className="absolute bottom-12 left-1/3 w-5 h-5 text-white/20 animate-pulse" style={{ animationDelay: "0.5s" }} />
      <Sparkles className="absolute top-1/3 left-10 w-4 h-4 text-white/25 animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Morphing shape */}
      <div className="absolute bottom-10 left-1/4 w-24 h-24 bg-white/5 animate-morph" />

      <div className="container-tight text-center relative">
        <AnimatedSection animation="fade-up">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            {t("title1")}
            <br />
            <span className="text-white/90">{t("title2")}</span>
          </h2>
        </AnimatedSection>

        <AnimatedSection animation="fade-up" delay={100}>
          <p className="text-white/80 mb-8 max-w-xl mx-auto text-lg">
            {t("description")}
          </p>
        </AnimatedSection>

        <AnimatedSection animation="scale-in" delay={200}>
          <a
            href="#"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-white/90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 group"
          >
            {t("button")}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </AnimatedSection>

        <AnimatedSection animation="fade-in" delay={400}>
          <p className="text-white/60 text-sm mt-8 flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              {t("note").split("·")[0]}
            </span>
            <span>·</span>
            <span>{t("note").split("·")[1]}</span>
            <span>·</span>
            <span>{t("note").split("·")[2]}</span>
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
