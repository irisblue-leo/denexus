"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { locales, localeNames, type Locale } from "@/i18n/config";

interface LanguageToggleProps {
  currentLocale: string;
}

export function LanguageToggle({ currentLocale }: LanguageToggleProps) {
  const router = useRouter();

  const switchLocale = (locale: Locale) => {
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
    router.refresh();
  };

  const nextLocale = currentLocale === 'zh' ? 'en' : 'zh';

  return (
    <button
      onClick={() => switchLocale(nextLocale as Locale)}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
      aria-label="Switch language"
    >
      <Globe className="w-4 h-4" />
      <span>{localeNames[nextLocale as Locale]}</span>
    </button>
  );
}
