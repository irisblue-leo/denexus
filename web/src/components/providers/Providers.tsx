"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthPanel from "@/components/auth/AuthPanel";
import { AuthPanelWrapper } from "./AuthPanelWrapper";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <AuthProvider>
        {children}
        <AuthPanelWrapper />
      </AuthProvider>
    </ThemeProvider>
  );
}
