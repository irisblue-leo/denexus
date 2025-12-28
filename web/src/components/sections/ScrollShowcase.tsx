"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import {
  Video,
  Wand2,
  Users,
  Globe,
  BarChart3,
  ChevronDown,
} from "lucide-react";

// Dynamically import animation component to avoid SSR issues
const ShowcaseAnimation = dynamic(() => import("@/components/3d/ShowcaseAnimation"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  ),
});

interface ShowcaseItem {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function ScrollShowcase() {
  const t = useTranslations("showcase");
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const showcaseItems: ShowcaseItem[] = [
    {
      id: 0,
      icon: <Video className="w-6 h-6" />,
      title: t("item1Title"),
      description: t("item1Desc"),
    },
    {
      id: 1,
      icon: <Wand2 className="w-6 h-6" />,
      title: t("item2Title"),
      description: t("item2Desc"),
    },
    {
      id: 2,
      icon: <Users className="w-6 h-6" />,
      title: t("item3Title"),
      description: t("item3Desc"),
    },
    {
      id: 3,
      icon: <Globe className="w-6 h-6" />,
      title: t("item4Title"),
      description: t("item4Desc"),
    },
    {
      id: 4,
      icon: <BarChart3 className="w-6 h-6" />,
      title: t("item5Title"),
      description: t("item5Desc"),
    },
  ];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const containerHeight = container.offsetHeight;
      const viewportHeight = window.innerHeight;

      const scrollStart = rect.top;
      const scrollEnd = rect.bottom - viewportHeight;
      const totalScroll = containerHeight - viewportHeight;

      if (scrollStart > 0) {
        setScrollProgress(0);
        setActiveIndex(0);
      } else if (scrollEnd < 0) {
        setScrollProgress(1);
        setActiveIndex(showcaseItems.length - 1);
      } else {
        const progress = Math.abs(scrollStart) / totalScroll;
        setScrollProgress(progress);
        const newIndex = Math.min(
          Math.floor(progress * showcaseItems.length),
          showcaseItems.length - 1
        );
        setActiveIndex(newIndex);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [showcaseItems.length]);

  const currentItem = showcaseItems[activeIndex];

  return (
    <section
      ref={containerRef}
      className="relative bg-background"
      style={{ height: `${showcaseItems.length * 100}vh` }}
    >
      {/* Sticky container */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent-500/5 rounded-full blur-[80px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="container-tight">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-20 items-center">
              {/* Left side - Content */}
              <div className="space-y-6 lg:space-y-8 order-2 lg:order-1">
                {/* Progress indicator */}
                <div className="flex items-center gap-2">
                  {showcaseItems.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 rounded-full transition-all duration-500 ${
                        idx === activeIndex
                          ? "w-8 bg-primary-500"
                          : idx < activeIndex
                          ? "w-4 bg-primary-500/50"
                          : "w-4 bg-border"
                      }`}
                    />
                  ))}
                </div>

                {/* Icon badge */}
                <div className="inline-flex p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  {currentItem.icon}
                </div>

                {/* Title */}
                <h2
                  className="text-2xl md:text-3xl lg:text-5xl font-bold text-foreground leading-tight"
                  key={`title-${activeIndex}`}
                >
                  {currentItem.title}
                </h2>

                {/* Description */}
                <p
                  className="text-base lg:text-lg text-muted-foreground max-w-lg leading-relaxed"
                  key={`desc-${activeIndex}`}
                >
                  {currentItem.description}
                </p>

                {/* Counter */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-2xl font-bold text-foreground">
                    {String(activeIndex + 1).padStart(2, "0")}
                  </span>
                  <span>/</span>
                  <span>{String(showcaseItems.length).padStart(2, "0")}</span>
                </div>
              </div>

              {/* Right side - Animation */}
              <div className="h-[280px] sm:h-[320px] lg:h-[500px] order-1 lg:order-2">
                <ShowcaseAnimation activeIndex={activeIndex} scrollProgress={scrollProgress} />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground flex flex-col items-center gap-2 animate-bounce">
          <span className="text-sm">{t("scrollHint")}</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>
    </section>
  );
}
