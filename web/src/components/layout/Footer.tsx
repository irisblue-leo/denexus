"use client";

import { useTranslations } from "next-intl";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="bg-card border-t border-border py-12 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-200/5 dark:bg-primary-800/5 rounded-full blur-3xl" />

      <div className="container-tight relative">
        <AnimatedSection animation="fade-up">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4 group cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <span className="text-white font-bold text-sm">D</span>
                </div>
                <span className="text-lg font-bold text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  Denexus
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t("description")}
              </p>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">{t("legal")}</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
                  >
                    {t("terms")}
                    <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
                  >
                    {t("privacy")}
                    <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">{t("contact")}</h3>
              <a
                href="mailto:support@denexus.com"
                className="text-sm text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                support@denexus.com
              </a>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection animation="fade-in" delay={200}>
          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t("copyright")}
            </p>
            <div className="flex items-center gap-2">
              {["VISA", "MC", "AMEX", "DISC"].map((card, i) => (
                <div
                  key={card}
                  className="w-10 h-6 rounded bg-secondary flex items-center justify-center text-[10px] font-medium text-muted-foreground hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {card}
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </footer>
  );
}
