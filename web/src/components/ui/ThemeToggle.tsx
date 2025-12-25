"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";

    // Check if View Transitions API is supported
    if (
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      buttonRef.current
    ) {
      // Get button position for the transition origin
      const rect = buttonRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      // Calculate the maximum radius needed to cover the entire screen
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      // Set CSS custom properties for the transition
      document.documentElement.style.setProperty("--theme-toggle-x", `${x}px`);
      document.documentElement.style.setProperty("--theme-toggle-y", `${y}px`);
      document.documentElement.style.setProperty("--theme-toggle-radius", `${maxRadius}px`);

      // Start view transition
      const transition = (document as Document & { startViewTransition: (callback: () => void) => { ready: Promise<void> } }).startViewTransition(() => {
        setTheme(newTheme);
      });
      await transition.ready;
    } else {
      // Fallback for browsers without View Transitions API
      setTheme(newTheme);
    }
  };

  if (!mounted) {
    return (
      <button className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
        <Sun className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleThemeChange}
      className="w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors relative overflow-hidden"
      aria-label="Toggle theme"
    >
      <div className="relative">
        {theme === "dark" ? (
          <Sun className="w-4 h-4 text-foreground animate-theme-icon" />
        ) : (
          <Moon className="w-4 h-4 text-foreground animate-theme-icon" />
        )}
      </div>
    </button>
  );
}
