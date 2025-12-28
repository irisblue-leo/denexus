"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Upload,
  Wand2,
  Sparkles,
  Download,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface Step {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function HowItWorksSection() {
  const t = useTranslations("howItWorks");
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  const steps: Step[] = [
    {
      id: 0,
      icon: <Upload className="w-8 h-8" />,
      title: t("step1Title"),
      description: t("step1Desc"),
    },
    {
      id: 1,
      icon: <Wand2 className="w-8 h-8" />,
      title: t("step2Title"),
      description: t("step2Desc"),
    },
    {
      id: 2,
      icon: <Sparkles className="w-8 h-8" />,
      title: t("step3Title"),
      description: t("step3Desc"),
    },
    {
      id: 3,
      icon: <Download className="w-8 h-8" />,
      title: t("step4Title"),
      description: t("step4Desc"),
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stepId = parseInt(entry.target.getAttribute("data-step") || "0");
            setVisibleSteps((prev) => {
              if (!prev.includes(stepId)) {
                return [...prev, stepId];
              }
              return prev;
            });
            setActiveStep(stepId);
          }
        });
      },
      { threshold: 0.5 }
    );

    const stepElements = document.querySelectorAll("[data-step]");
    stepElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 bg-gradient-to-b from-background via-slate-50 to-background dark:from-background dark:via-slate-900/50 dark:to-background overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="container-tight relative">
        {/* Header */}
        <div className="text-center mb-16 md:mb-24">
          <div className="inline-flex items-center gap-2 tag tag-primary mb-4">
            <Sparkles className="w-4 h-4" />
            {t("badge")}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500/20 via-primary-500/40 to-accent-500/20 hidden md:block -translate-x-1/2" />

          <div className="space-y-16 md:space-y-24">
            {steps.map((step, index) => (
              <div
                key={step.id}
                data-step={step.id}
                className={`relative transition-all duration-700 ${
                  visibleSteps.includes(step.id)
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-12"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div
                  className={`flex flex-col md:flex-row items-center gap-8 ${
                    index % 2 === 1 ? "md:flex-row-reverse" : ""
                  }`}
                >
                  {/* Content */}
                  <div className={`flex-1 ${index % 2 === 1 ? "md:text-right" : ""}`}>
                    <div
                      className={`inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 mb-2 ${
                        index % 2 === 1 ? "md:flex-row-reverse" : ""
                      }`}
                    >
                      <span className="px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30">
                        {t("stepLabel")} {step.id + 1}
                      </span>
                      {visibleSteps.includes(step.id) && (
                        <CheckCircle2 className="w-4 h-4 text-accent-500 animate-scale-in" />
                      )}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                      {step.description}
                    </p>
                  </div>

                  {/* Center icon */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                        activeStep === step.id
                          ? "bg-gradient-to-br from-primary-500 to-accent-500 text-white scale-110 shadow-xl shadow-primary-500/30"
                          : visibleSteps.includes(step.id)
                          ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                          : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                      }`}
                    >
                      {step.icon}
                    </div>

                    {/* Pulse effect for active */}
                    {activeStep === step.id && (
                      <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping" />
                    )}
                  </div>

                  {/* Visual placeholder */}
                  <div className="flex-1">
                    <div
                      className={`aspect-video rounded-2xl bg-gradient-to-br overflow-hidden transition-all duration-500 ${
                        visibleSteps.includes(step.id)
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-95"
                      } ${
                        index === 0 ? "from-purple-500/10 to-indigo-500/10" :
                        index === 1 ? "from-blue-500/10 to-cyan-500/10" :
                        index === 2 ? "from-emerald-500/10 to-teal-500/10" :
                        "from-orange-500/10 to-amber-500/10"
                      }`}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          index === 0 ? "bg-purple-500/20 text-purple-500" :
                          index === 1 ? "bg-blue-500/20 text-blue-500" :
                          index === 2 ? "bg-emerald-500/20 text-emerald-500" :
                          "bg-orange-500/20 text-orange-500"
                        }`}>
                          {step.icon}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow to next step */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex justify-center mt-8">
                    <ArrowRight
                      className={`w-6 h-6 rotate-90 transition-all duration-500 ${
                        visibleSteps.includes(step.id)
                          ? "text-primary-500 translate-y-0 opacity-100"
                          : "text-muted-foreground -translate-y-4 opacity-0"
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
