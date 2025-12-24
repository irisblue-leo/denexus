"use client";

import { useTranslations } from "next-intl";
import { Users, Sparkles, PiggyBank, Globe } from "lucide-react";
import { AnimatedSection, AnimatedItem } from "@/components/ui/AnimatedSection";

export default function UGCNetworkSection() {
  const t = useTranslations("ugc");

  const features = [
    { icon: Users, title: t("feature1Title"), desc: t("feature1Desc") },
    { icon: Sparkles, title: t("feature2Title"), desc: t("feature2Desc") },
    { icon: PiggyBank, title: t("feature3Title"), desc: t("feature3Desc") },
  ];

  return (
    <section className="section-padding bg-secondary/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent-200/20 dark:bg-accent-800/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className="container-tight relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Visual - Animated Orbit */}
          <AnimatedSection animation="fade-right" className="order-2 lg:order-1">
            <div className="relative w-full max-w-sm mx-auto aspect-square">
              {/* Outer orbit ring */}
              <div className="absolute inset-4 border-2 border-dashed border-border rounded-full animate-spin-slow opacity-30" />

              {/* Middle orbit ring */}
              <div className="absolute inset-12 border border-dashed border-accent-300 dark:border-accent-700 rounded-full animate-spin-slow opacity-40" style={{ animationDirection: "reverse", animationDuration: "12s" }} />

              {/* Inner orbit ring */}
              <div className="absolute inset-20 border border-dotted border-primary-300 dark:border-primary-700 rounded-full animate-spin-slow opacity-30" style={{ animationDuration: "6s" }} />

              {/* Center - Brand */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center shadow-lg animate-pulse-glow">
                  <span className="text-white font-bold text-lg">Brand</span>
                </div>
              </div>

              {/* Orbiting Nodes */}
              {[
                { top: "5%", left: "50%", color: "bg-primary-500", delay: "0s", label: "1" },
                { top: "50%", left: "95%", color: "bg-accent-500", delay: "0.5s", label: "2" },
                { top: "50%", left: "5%", color: "bg-purple-500", delay: "1s", label: "3" },
                { top: "95%", left: "50%", color: "bg-pink-500", delay: "1.5s", label: "4" },
              ].map((node, i) => (
                <div
                  key={i}
                  className={`absolute w-10 h-10 rounded-full ${node.color} flex items-center justify-center text-white text-sm font-bold shadow-lg -translate-x-1/2 -translate-y-1/2 animate-bounce-soft hover:scale-125 transition-transform cursor-pointer`}
                  style={{ top: node.top, left: node.left, animationDelay: node.delay }}
                >
                  {node.label}
                </div>
              ))}

              {/* Connecting lines (animated) */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <line x1="50" y1="50" x2="50" y2="5" className="stroke-primary-300/30 dark:stroke-primary-600/30" strokeWidth="0.5" strokeDasharray="2,2">
                  <animate attributeName="stroke-dashoffset" values="0;4" dur="1s" repeatCount="indefinite" />
                </line>
                <line x1="50" y1="50" x2="95" y2="50" className="stroke-accent-300/30 dark:stroke-accent-600/30" strokeWidth="0.5" strokeDasharray="2,2">
                  <animate attributeName="stroke-dashoffset" values="0;4" dur="1s" repeatCount="indefinite" />
                </line>
                <line x1="50" y1="50" x2="5" y2="50" className="stroke-purple-300/30 dark:stroke-purple-600/30" strokeWidth="0.5" strokeDasharray="2,2">
                  <animate attributeName="stroke-dashoffset" values="0;4" dur="1s" repeatCount="indefinite" />
                </line>
                <line x1="50" y1="50" x2="50" y2="95" className="stroke-pink-300/30 dark:stroke-pink-600/30" strokeWidth="0.5" strokeDasharray="2,2">
                  <animate attributeName="stroke-dashoffset" values="0;4" dur="1s" repeatCount="indefinite" />
                </line>
              </svg>
            </div>
          </AnimatedSection>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <AnimatedSection animation="fade-left">
              <div className="tag tag-accent mb-4 group hover:scale-105 transition-transform cursor-default">
                <Globe className="w-3.5 h-3.5 group-hover:animate-spin-slow" />
                {t("tag")}
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={100}>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 leading-tight">
                {t("title1")}
              </h2>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                <span className="gradient-text">{t("title2")}</span>
              </h2>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={200}>
              <p className="text-muted-foreground mb-8">
                {t("description")}
              </p>
            </AnimatedSection>

            <div className="space-y-3">
              {features.map((feature, index) => (
                <AnimatedItem key={index} index={index} baseDelay={100} animation="fade-right">
                  <div className="card-base card-hover p-4 flex gap-4 group cursor-pointer">
                    <div className="icon-box icon-box-accent shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </AnimatedItem>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
