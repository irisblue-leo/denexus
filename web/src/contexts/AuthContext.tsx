"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  phone?: string;
  email?: string;
  credits: number;
}

interface AuthContextType {
  isAuthPanelOpen: boolean;
  openAuthPanel: () => void;
  closeAuthPanel: () => void;
  isLoggedIn: boolean;
  user: User | null;
  isLoading: boolean;
  login: (data: LoginData) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  sendCode: (identifier: string, locale?: string) => Promise<{ success: boolean; code?: string; error?: string }>;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface LoginData {
  loginMethod: "password" | "sms";
  emailOrPhone?: string;
  password?: string;
  phone?: string;
  verifyCode?: string;
}

interface RegisterData {
  registerMethod: "phone" | "email";
  phone?: string;
  email?: string;
  password: string;
  verifyCode?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthPanelOpen, setIsAuthPanelOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const openAuthPanel = () => setIsAuthPanelOpen(true);
  const closeAuthPanel = () => setIsAuthPanelOpen(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (data: LoginData): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setUser(result.user);
        closeAuthPanel();
        router.push("/workspace");
        return { success: true };
      }

      return { success: false, error: result.error || "Login failed" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error" };
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setUser(result.user);
        closeAuthPanel();
        router.push("/workspace");
        return { success: true };
      }

      return { success: false, error: result.error || "Registration failed" };
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, error: "Network error" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const sendCode = async (identifier: string, locale: string = "zh"): Promise<{ success: boolean; code?: string; error?: string }> => {
    try {
      const isEmail = identifier.includes("@");
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEmail ? { email: identifier, locale } : { phone: identifier, locale }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        return { success: true, code: result.code };
      }

      return { success: false, error: result.error || "Failed to send code" };
    } catch (error) {
      console.error("Send code error:", error);
      return { success: false, error: "Network error" };
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Refresh user error:", error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthPanelOpen,
        openAuthPanel,
        closeAuthPanel,
        isLoggedIn: !!user,
        user,
        isLoading,
        login,
        register,
        logout,
        sendCode,
        checkAuth,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
