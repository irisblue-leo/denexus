"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthPanel from "@/components/auth/AuthPanel";

export function AuthPanelWrapper() {
  const { isAuthPanelOpen, closeAuthPanel } = useAuth();

  return <AuthPanel isOpen={isAuthPanelOpen} onClose={closeAuthPanel} />;
}
