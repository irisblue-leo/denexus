"use client";

import { useTranslations } from "next-intl";
import { Star, Quote } from "lucide-react";
import { AnimatedSection, AnimatedItem } from "@/components/ui/AnimatedSection";

export default function TestimonialsSection() {
  const t = useTranslations("testimonials");

  const testimonials = [
    { quote: t("quote1"), author: t("author1"), avatar: "H" },
    { quote: t("quote2"), author: t("author2"), avatar: "F" },
  ];

  const stats = [
    { value: "500+", label: t("stat1") },
    { value: "10K+", label: t("stat2") },
    { value: "98%", label: t("stat3") },
    { value: "2x", label: t("stat4") },
  ];

  return (
    <section className="section-padding bg-secondary/30 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary-200/20 dark:bg-primary-800/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-accent-200/20 dark:bg-accent-800/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: "3s" }} />
      </div>

      <div className="container-tight relative">
        {/* Header */}
        <AnimatedSection animation="fade-up" className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            {t("title1")} <span className="gradient-text">{t("title2")}</span>
          </h2>
          <p className="text-muted-foreground mt-4">{t("description")}</p>
        </AnimatedSection>

        {/* Testimonials */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {testimonials.map((item, i) => (
            <AnimatedItem key={i} index={i} baseDelay={200} animation="scale-in">
              <div className="card-base card-hover p-6 relative group">
                {/* Animated quote icon */}
                <Quote className="w-8 h-8 text-primary-200 dark:text-primary-800 absolute top-4 right-4 group-hover:scale-110 group-hover:rotate-12 transition-transform" />

                {/* Stars with stagger animation */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 text-yellow-400 animate-pulse"
                      fill="currentColor"
                      style={{ animationDelay: `${j * 0.1}s` }}
                    />
                  ))}
                </div>

                <p className="text-foreground mb-6 leading-relaxed group-hover:text-primary-900 dark:group-hover:text-primary-100 transition-colors">
                  &quot;{item.quote}&quot;
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-lg">
                    {item.avatar}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {item.author}
                  </span>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-500/10 to-accent-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              </div>
            </AnimatedItem>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <AnimatedItem key={i} index={i} baseDelay={100} animation="fade-up">
              <div className="text-center group cursor-default">
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1 group-hover:scale-110 transition-transform inline-block">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {stat.label}
                </div>
              </div>
            </AnimatedItem>
          ))}
        </div>
      </div>
    </section>
  );
}
