"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { X, Phone, Lock, Eye, EyeOff, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import dynamic from "next/dynamic";

// Dynamically import StarryBackground to avoid SSR issues with canvas
const StarryBackground = dynamic(() => import("./StarryBackground"), {
  ssr: false,
});

interface AuthPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = "login" | "register";
type LoginMethod = "password" | "sms";
type RegisterMethod = "phone" | "email";

export default function AuthPanel({ isOpen, onClose }: AuthPanelProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { login, register, sendCode } = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");
  const [registerMethod, setRegisterMethod] = useState<RegisterMethod>("phone");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [formData, setFormData] = useState({
    emailOrPhone: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    verifyCode: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    const identifier = authMode === "login" ? formData.emailOrPhone :
      registerMethod === "phone" ? formData.phone : formData.email;

    if (!identifier) {
      setError(registerMethod === "phone" ? t("phonePlaceholder") : t("emailPlaceholder"));
      return;
    }

    setIsSendingCode(true);
    setError("");

    const result = await sendCode(identifier, locale);

    if (result.success) {
      startCountdown();
      if (result.code) {
        setFormData((prev) => ({ ...prev, verifyCode: result.code! }));
      }
    } else {
      setError(result.error || "Failed to send code");
    }

    setIsSendingCode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (authMode === "login") {
        if (loginMethod === "password") {
          if (!formData.emailOrPhone || !formData.password) {
            setError("Please fill in all fields");
            setIsLoading(false);
            return;
          }

          const result = await login({
            loginMethod: "password",
            emailOrPhone: formData.emailOrPhone,
            password: formData.password,
          });

          if (!result.success) {
            setError(result.error || "Login failed");
          }
        } else {
          if (!formData.emailOrPhone || !formData.verifyCode) {
            setError("Please fill in all fields");
            setIsLoading(false);
            return;
          }

          const result = await login({
            loginMethod: "sms",
            phone: formData.emailOrPhone,
            verifyCode: formData.verifyCode,
          });

          if (!result.success) {
            setError(result.error || "Login failed");
          }
        }
      } else {
        if (!agreeToTerms) {
          setError("Please agree to the terms");
          setIsLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          setIsLoading(false);
          return;
        }

        if (registerMethod === "phone") {
          if (!formData.phone || !formData.verifyCode || !formData.password) {
            setError("Please fill in all fields");
            setIsLoading(false);
            return;
          }

          const result = await register({
            registerMethod: "phone",
            phone: formData.phone,
            password: formData.password,
            verifyCode: formData.verifyCode,
          });

          if (!result.success) {
            setError(result.error || "Registration failed");
          }
        } else {
          if (!formData.email || !formData.verifyCode || !formData.password) {
            setError("Please fill in all fields");
            setIsLoading(false);
            return;
          }

          const result = await register({
            registerMethod: "email",
            email: formData.email,
            password: formData.password,
            verifyCode: formData.verifyCode,
          });

          if (!result.success) {
            setError(result.error || "Registration failed");
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setError("");
    setFormData({
      emailOrPhone: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      verifyCode: "",
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel - Slide from right */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-5xl bg-white dark:bg-slate-900 z-50 shadow-2xl transition-transform duration-500 ease-out overflow-hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-20"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="flex h-full">
          {/* Left side - Starry Background (hidden on mobile) */}
          <div className="hidden md:block relative w-1/2 h-full flex-shrink-0 overflow-hidden">
            <StarryBackground />
          </div>

          {/* Right side - Form */}
          <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 md:p-8 overflow-y-auto bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-900 dark:to-slate-900">
            {/* Card */}
            <div className="w-full max-w-sm">
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {t("title")}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {authMode === "login" ? t("subtitle") : t("registerSubtitle")}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Login mode tabs */}
              {authMode === "login" && (
                <div className="flex bg-secondary rounded-xl p-1 mb-6">
                  <button
                    onClick={() => setLoginMethod("password")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                      loginMethod === "password"
                        ? "bg-white dark:bg-card text-primary-600 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("passwordLogin")}
                  </button>
                  <button
                    onClick={() => setLoginMethod("sms")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                      loginMethod === "sms"
                        ? "bg-white dark:bg-card text-primary-600 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("smsLogin")}
                  </button>
                </div>
              )}

              {/* Register mode tabs */}
              {authMode === "register" && (
                <div className="flex bg-secondary rounded-xl p-1 mb-6">
                  <button
                    onClick={() => setRegisterMethod("phone")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      registerMethod === "phone"
                        ? "bg-white dark:bg-card text-primary-600 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {t("phoneRegister")}
                  </button>
                  <button
                    onClick={() => setRegisterMethod("email")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      registerMethod === "email"
                        ? "bg-white dark:bg-card text-primary-600 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {t("emailRegister")}
                  </button>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* === LOGIN FORM === */}
                {authMode === "login" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        <span className="text-red-500">*</span> {t("emailOrPhone")}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          name="emailOrPhone"
                          value={formData.emailOrPhone}
                          onChange={handleInputChange}
                          placeholder={t("emailOrPhonePlaceholder")}
                          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    {loginMethod === "password" && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          <span className="text-red-500">*</span> {t("password")}
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder={t("passwordPlaceholder")}
                            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {loginMethod === "sms" && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          <span className="text-red-500">*</span> {t("verifyCode")}
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="text"
                              name="verifyCode"
                              value={formData.verifyCode}
                              onChange={handleInputChange}
                              placeholder={t("verifyCodePlaceholder")}
                              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSendCode}
                            disabled={countdown > 0 || isSendingCode}
                            className="px-4 py-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium rounded-xl hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSendingCode ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : countdown > 0 ? (
                              `${countdown}s`
                            ) : (
                              t("sendCode")
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* === REGISTER FORM === */}
                {authMode === "register" && (
                  <>
                    {registerMethod === "phone" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            <span className="text-red-500">*</span> {t("phone")}
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              placeholder={t("phonePlaceholder")}
                              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            <span className="text-red-500">*</span> {t("verifyCode")}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              name="verifyCode"
                              value={formData.verifyCode}
                              onChange={handleInputChange}
                              placeholder={t("verifyCodePlaceholder")}
                              className="flex-1 px-4 py-3 bg-white dark:bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            />
                            <button
                              type="button"
                              onClick={handleSendCode}
                              disabled={countdown > 0 || isSendingCode}
                              className="px-4 py-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium rounded-xl hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSendingCode ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : countdown > 0 ? (
                                `${countdown}s`
                              ) : (
                                t("sendCode")
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {registerMethod === "email" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            <span className="text-red-500">*</span> {t("email")}
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              placeholder={t("emailPlaceholder")}
                              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            <span className="text-red-500">*</span> {t("verifyCode")}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              name="verifyCode"
                              value={formData.verifyCode}
                              onChange={handleInputChange}
                              placeholder={t("verifyCodePlaceholder")}
                              className="flex-1 px-4 py-3 bg-white dark:bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            />
                            <button
                              type="button"
                              onClick={handleSendCode}
                              disabled={countdown > 0 || isSendingCode}
                              className="px-4 py-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium rounded-xl hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSendingCode ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : countdown > 0 ? (
                                `${countdown}s`
                              ) : (
                                t("sendCode")
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        <span className="text-red-500">*</span> {t("password")}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder={t("setPasswordPlaceholder")}
                          className="w-full pl-10 pr-10 py-3 bg-white dark:bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{t("passwordHint")}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        <span className="text-red-500">*</span> {t("confirmPassword")}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          placeholder={t("confirmPasswordPlaceholder")}
                          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="agreeTerms"
                        checked={agreeToTerms}
                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="agreeTerms" className="text-xs text-muted-foreground">
                        {t("agreeToTerms")}{" "}
                        <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
                          {t("userAgreement")}
                        </a>{" "}
                        {t("and")}{" "}
                        <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
                          {t("privacyPolicy")}
                        </a>
                      </label>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {authMode === "login" ? t("loginBtn") : t("registerBtn")}
                </button>
              </form>

              <div className="text-center mt-6">
                <span className="text-sm text-muted-foreground">
                  {authMode === "login" ? t("noAccount") : t("hasAccount")}{" "}
                </span>
                <button
                  onClick={() => switchAuthMode(authMode === "login" ? "register" : "login")}
                  className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {authMode === "login" ? t("signUp") : t("signIn")}
                </button>
              </div>

              {authMode === "login" && (
                <div className="mt-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t("agreeToTerms")}{" "}
                    <a href="#" className="hover:text-foreground transition-colors">
                      {t("userAgreement")}
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
