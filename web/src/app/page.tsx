import { getLocale } from "next-intl/server";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import AIEngineSection from "@/components/sections/AIEngineSection";
import UGCNetworkSection from "@/components/sections/UGCNetworkSection";
import PricingSection from "@/components/sections/PricingSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import FAQSection from "@/components/sections/FAQSection";
import CTASection from "@/components/sections/CTASection";

export default async function Home() {
  const locale = await getLocale();

  return (
    <main className="min-h-screen bg-background">
      <Header locale={locale} />
      <HeroSection />
      <AIEngineSection />
      <UGCNetworkSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
