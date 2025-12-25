"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/workspace/Sidebar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleToggle = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const handleCloseMobileMenu = () => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Mobile overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={handleCloseMobileMenu}
        />
      )}

      <Sidebar
        isCollapsed={isMobile ? false : isSidebarCollapsed}
        isMobile={isMobile}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggle={handleToggle}
        onCloseMobile={handleCloseMobileMenu}
      />

      <main
        className={`transition-all duration-300 min-h-screen ${
          isMobile ? "ml-0" : isSidebarCollapsed ? "ml-16" : "ml-56"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
