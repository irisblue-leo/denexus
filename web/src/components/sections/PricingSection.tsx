"use client";

import { useTranslations } from "next-intl";
import { Check, X, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/ui/AnimatedSection";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function PricingSection() {
  const t = useTranslations("pricing");
  const tc = useTranslations("common");
  const { openAuthPanel, isLoggedIn } = useAuth();
  const router = useRouter();

  const handleBuyClick = () => {
    if (isLoggedIn) {
      router.push("/workspace/buy");
    } else {
      openAuthPanel();
    }
  };

  const plans = [
    {
      name: t("free"),
      desc: t("freeDesc"),
      price: t("freePrice"),
      note: "",
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
      price: "¥199",
      note: "",
      originalPrice: "¥299",
      btn: tc("buyNow"),
      primary: true,
      badge: t("popular"),
      features: [
        { text: t("feature1", { points: 500 }), ok: true },
        { text: t("feature2", { count: 100 }), ok: true },
        { text: t("feature3", { count: 250 }), ok: true },
        { text: t("feature4", { seconds: 25 }), ok: true },
        { text: t("feature5"), ok: true },
        { text: t("feature6"), ok: true },
        { text: t("feature7"), ok: true },
      ],
    },
    {
      name: t("starter"),
      desc: t("starterDesc"),
      price: "¥49",
      note: "",
      originalPrice: "¥69",
      btn: tc("buyNow"),
      primary: false,
      features: [
        { text: t("feature1", { points: 100 }), ok: true },
        { text: t("feature2", { count: 20 }), ok: true },
        { text: t("feature3", { count: 50 }), ok: true },
        { text: t("feature4", { seconds: 25 }), ok: true },
        { text: t("feature5"), ok: true },
        { text: t("feature6"), ok: true },
        { text: t("feature7"), ok: true },
      ],
    },
  ];

  return (
    <section id="pricing" className="section-padding relative overflow-hidden">
      {/* Enhanced background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary-200/20 to-accent-200/20 dark:from-primary-800/10 dark:to-accent-800/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-200/10 dark:bg-accent-800/5 rounded-full blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-200/10 dark:bg-primary-800/5 rounded-full blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
      </div>

      {/* Floating decorations */}
      <div className="absolute inset-0 -z-5 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-20 h-20 border border-primary-300/20 dark:border-primary-600/10 rounded-full animate-float" />
        <div className="absolute bottom-20 right-20 w-16 h-16 border border-accent-300/20 dark:border-accent-600/10 rounded-lg rotate-45 animate-float-slow" />
        <div className="absolute top-1/3 right-10 w-3 h-3 bg-primary-400/30 rounded-full animate-bounce-soft" />
        <div className="absolute bottom-1/3 left-10 w-2 h-2 bg-accent-400/30 rounded-full animate-bounce-soft" style={{ animationDelay: "1s" }} />
      </div>

      <ScrollReveal className="container-tight relative">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="tag tag-primary mb-4 mx-auto group hover:scale-105 transition-transform cursor-default">
            <Sparkles className="w-3.5 h-3.5 group-hover:animate-wiggle" />
            {t("tag")}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t("title")}
          </h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div key={i}>
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
                  {plan.originalPrice && (
                    <span className="ml-2 text-lg text-muted-foreground line-through">
                      {plan.originalPrice}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleBuyClick}
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
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
