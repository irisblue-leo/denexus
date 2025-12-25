"use client";

import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, MessageCircle } from "lucide-react";
import { ScrollReveal } from "@/components/ui/AnimatedSection";

export default function FAQSection() {
  const t = useTranslations("faq");

  const faqs = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
  ];

  return (
    <section id="faq" className="section-padding relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-200/20 dark:bg-primary-800/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <ScrollReveal className="container-tight max-w-3xl relative">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="tag tag-primary mb-4 mx-auto group hover:scale-105 transition-transform cursor-default">
            <HelpCircle className="w-3.5 h-3.5 group-hover:animate-wiggle" />
            {t("tag")}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t("title")}
          </h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        {/* FAQ */}
        <div className="card-base overflow-hidden">
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="px-6 group transition-colors hover:bg-secondary/30"
              >
                <AccordionTrigger className="py-5 text-left group-hover:no-underline">
                  <div className="flex items-start gap-3">
                    <span className="text-primary-600 dark:text-primary-400 font-bold shrink-0 group-hover:scale-110 transition-transform">
                      Q
                    </span>
                    <span className="font-medium text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {faq.q}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <div className="flex items-start gap-3 pl-0">
                    <span className="text-accent-600 dark:text-accent-400 font-bold shrink-0">
                      A
                    </span>
                    <span className="text-muted-foreground leading-relaxed">
                      {faq.a}
                    </span>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact */}
        <div className="text-center mt-8">
          <p className="text-muted-foreground mb-3">{t("moreQuestions")}</p>
          <a
            href="mailto:support@denexus.com"
            className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium hover:underline group"
          >
            <MessageCircle className="w-4 h-4 group-hover:scale-110 group-hover:rotate-12 transition-transform" />
            {t("contactSupport")}
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      </ScrollReveal>
    </section>
  );
}
