"use client";

import { ReactNode } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: "fade-up" | "fade-down" | "fade-left" | "fade-right" | "scale-in" | "fade-in";
  delay?: number;
  threshold?: number;
}

export function AnimatedSection({
  children,
  className = "",
  animation = "fade-up",
  delay = 0,
  threshold = 0.1,
}: AnimatedSectionProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold });

  // Use CSS transitions for smooth animations instead of keyframes
  const getTransform = () => {
    if (isVisible) return "translate3d(0, 0, 0) scale(1)";
    switch (animation) {
      case "fade-up":
        return "translate3d(0, 80px, 0)";
      case "fade-down":
        return "translate3d(0, -80px, 0)";
      case "fade-left":
        return "translate3d(80px, 0, 0)";
      case "fade-right":
        return "translate3d(-80px, 0, 0)";
      case "scale-in":
        return "scale(0.9)";
      default:
        return "translate3d(0, 0, 0)";
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: `opacity 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

interface AnimatedItemProps {
  children: ReactNode;
  className?: string;
  animation?: "fade-up" | "fade-down" | "fade-left" | "fade-right" | "scale-in";
  index?: number;
  baseDelay?: number;
}

export function AnimatedItem({
  children,
  className = "",
  animation = "fade-up",
  index = 0,
  baseDelay = 100,
}: AnimatedItemProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });

  const getTransform = () => {
    if (isVisible) return "translate3d(0, 0, 0) scale(1)";
    switch (animation) {
      case "fade-up":
        return "translate3d(0, 60px, 0)";
      case "fade-down":
        return "translate3d(0, -60px, 0)";
      case "fade-left":
        return "translate3d(60px, 0, 0)";
      case "fade-right":
        return "translate3d(-60px, 0, 0)";
      case "scale-in":
        return "scale(0.9)";
      default:
        return "translate3d(0, 0, 0)";
    }
  };

  const delay = index * baseDelay;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: `opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

// New component for animating entire sections as a block
interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.08 });

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translate3d(0, 0, 0)" : "translate3d(0, 100px, 0)",
        transition: `opacity 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
