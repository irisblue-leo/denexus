"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Sparkles, Zap } from "lucide-react";
import { AnimatedSection, AnimatedItem } from "@/components/ui/AnimatedSection";

export default function PricingSection() {
  const t = useTranslations("pricing");
  const tc = useTranslations("common");
  const [isYearly, setIsYearly] = useState(true);

  const plans = [
    {
      name: t("free"),
      desc: t("freeDesc"),
      price: t("freePrice"),
      note: t("freePriceNote"),
      btn: tc("getStarted"),
      primary: false,
      features: [
        { text: t("feature1", { points: 20 }), ok: true },
        { text: t("feature2", { count: 4 }), ok: true },
        { text: t("feature3", { count: 10 }), ok: true },
        { text: t("feature4", { seconds: 15 }), ok: true },
        { text: t("feature5"), ok: true },
        { text: t("feature6"), ok: false },
        { text: t("feature7"), ok: false },
      ],
    },
    {
      name: t("pro"),
      desc: t("proDesc"),
      price: isYearly ? "$99" : "$129",
      note: isYearly ? "/mo" : "/mo",
      discount: isYearly ? `${tc("save")} 23%` : null,
      btn: tc("buyNow"),
      primary: true,
      badge: t("popular"),
      features: [
        { text: t("feature1", { points: 4000 }), ok: true },
        { text: t("feature2", { count: 800 }), ok: true },
        { text: t("feature3", { count: 2000 }), ok: true },
        { text: t("feature4", { seconds: 25 }), ok: true },
        { text: t("feature5"), ok: true },
        { text: t("feature6"), ok: true },
        { text: t("feature7"), ok: true },
      ],
    },
    {
      name: t("starter"),
      desc: t("starterDesc"),
      price: isYearly ? "$29" : "$39",
      note: isYearly ? "/mo" : "/mo",
      discount: isYearly ? `${tc("save")} 26%` : null,
      btn: tc("buyNow"),
      primary: false,
      features: [
        { text: t("feature1", { points: 900 }), ok: true },
        { text: t("feature2", { count: 180 }), ok: true },
        { text: t("feature3", { count: 450 }), ok: true },
        { text: t("feature4", { seconds: 25 }), ok: true },
        { text: t("feature5"), ok: true },
        { text: t("feature6"), ok: true },
        { text: t("feature7"), ok: true },
      ],
    },
  ];

  return (
    <section id="pricing" className="section-padding relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary-200/20 to-accent-200/20 dark:from-primary-800/10 dark:to-accent-800/10 rounded-full blur-3xl" />

      <div className="container-tight relative">
        {/* Header */}
        <AnimatedSection animation="fade-up" className="text-center mb-12">
          <div className="tag tag-primary mb-4 mx-auto group hover:scale-105 transition-transform cursor-default">
            <Sparkles className="w-3.5 h-3.5 group-hover:animate-wiggle" />
            {t("tag")}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t("title")}
          </h2>
          <p className="text-muted-foreground mb-8">{t("description")}</p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              {tc("monthly")}
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                isYearly ? 'bg-primary-600 shadow-lg shadow-primary-500/30' : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                  isYearly ? 'left-8' : 'left-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              {tc("yearly")}
            </span>
            {isYearly && (
              <span className="tag tag-accent animate-bounce-soft">
                <Zap className="w-3 h-3" />
                {tc("save")} 23%
              </span>
            )}
          </div>
        </AnimatedSection>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <AnimatedItem key={i} index={i} baseDelay={150} animation="fade-up">
              <div
                className={`relative card-base p-6 group transition-all duration-500 hover:-translate-y-2 ${
                  plan.primary
                    ? 'border-primary-500 shadow-xl shadow-primary-500/10 scale-105 md:scale-110'
                    : 'hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-primary-600 to-accent-600 text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-lg animate-pulse-soft">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">{plan.note}</span>
                  {plan.discount && (
                    <span className="ml-2 text-xs font-medium text-accent-600 dark:text-accent-400">
                      {plan.discount}
                    </span>
                  )}
                </div>

                <button
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 mb-6 group/btn overflow-hidden relative ${
                    plan.primary
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground'
                  }`}
                >
                  <span className="relative z-10">{plan.btn}</span>
                  {plan.primary && (
                    <div className="absolute inset-0 bg-gradient-to-r from-accent-500 to-primary-500 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  )}
                </button>

                <div className="space-y-3">
                  {plan.features.map((f, j) => (
                    <div
                      key={j}
                      className={`flex items-start gap-2 transition-all duration-200 ${
                        f.ok ? 'hover:translate-x-1' : ''
                      }`}
                    >
                      {f.ok ? (
                        <Check className="w-4 h-4 text-accent-500 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm ${f.ok ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Hover glow effect for primary */}
                {plan.primary && (
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-500/20 to-accent-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                )}
              </div>
            </AnimatedItem>
          ))}
        </div>
      </div>
    </section>
  );
}
