"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import {
  Sparkles,
  Check,
  Loader2,
  QrCode,
  X,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Package {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  credits: number;
  price: number;
  originalPrice: number | null;
  isPopular: boolean;
}

interface Order {
  id: string;
  orderNo: string;
  credits: number;
  amount: number;
  status: string;
  expireAt?: string;
}

interface PaymentInfo {
  type: "native" | "h5";
  codeUrl?: string;
  h5Url?: string;
}

export default function BuyPage() {
  const t = useTranslations("workspace");
  const locale = useLocale();
  const { user, refreshUser } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [creating, setCreating] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [polling, setPolling] = useState(false);
  const [showH5Guide, setShowH5Guide] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await fetch("/api/payment/packages");
      const data = await response.json();
      if (data.success) {
        // Filter out free package for purchase page
        setPackages(data.packages.filter((pkg: Package) => pkg.price > 0));
      }
    } catch (error) {
      console.error("Failed to fetch packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: Package) => {
    setSelectedPackage(pkg);
    setCreating(true);

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId: pkg.id }),
      });

      const data = await response.json();

      if (data.success && data.payment) {
        setCurrentOrder(data.order);
        setPaymentInfo(data.payment);

        if (data.payment.type === "h5" && data.payment.h5Url) {
          // H5 payment: redirect to WeChat payment page
          setShowH5Guide(true);
          startPolling(data.order.orderNo);
          // Open H5 payment URL in new window/tab for mobile users
          window.open(data.payment.h5Url, "_blank");
        } else if (data.payment.type === "native" && data.payment.codeUrl) {
          // Native payment: show QR code
          startPolling(data.order.orderNo);
        }
      } else {
        alert(data.error || t("purchaseFailed"));
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert(t("networkError"));
    } finally {
      setCreating(false);
    }
  };

  const startPolling = (orderNo: string) => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/query?orderNo=${orderNo}`);
        const data = await response.json();

        if (data.success) {
          if (data.order.status === "paid") {
            clearInterval(interval);
            setPolling(false);
            setCurrentOrder(null);
            setPaymentInfo(null);
            refreshUser();
            alert(t("paymentSuccess"));
          } else if (data.order.status === "expired") {
            clearInterval(interval);
            setPolling(false);
            setCurrentOrder(null);
            setPaymentInfo(null);
            alert(t("orderExpired"));
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);

    // Stop polling after 30 minutes
    setTimeout(() => {
      clearInterval(interval);
      setPolling(false);
    }, 30 * 60 * 1000);
  };

  const closePaymentModal = () => {
    setCurrentOrder(null);
    setPaymentInfo(null);
    setSelectedPackage(null);
    setPolling(false);
    setShowH5Guide(false);
  };

  const openH5Payment = () => {
    if (paymentInfo?.h5Url) {
      window.open(paymentInfo.h5Url, "_blank");
    }
  };

  const getPackageName = (pkg: Package) => {
    return locale === "zh" ? pkg.name : pkg.nameEn;
  };

  const getPackageDescription = (pkg: Package) => {
    return locale === "zh" ? pkg.description : pkg.descriptionEn;
  };

  const features = [
    t("feature1"),
    t("feature2"),
    t("feature3"),
    t("feature4"),
  ];

  if (loading) {
    return (
      <div className="p-6 h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 h-screen overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("buyCreditsTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("buyCreditsDescription")}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-full">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {t("currentCredits")}: {user?.credits || 0}
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-white dark:bg-card rounded-2xl border-2 p-6 transition-all ${
                pkg.isPopular
                  ? "border-primary-500 shadow-lg shadow-primary-500/20"
                  : "border-border hover:border-primary-300"
              }`}
            >
              {pkg.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
                    {t("mostPopular")}
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {getPackageName(pkg)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getPackageDescription(pkg)}
                </p>
              </div>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    ¥{pkg.price}
                  </span>
                  {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                    <span className="text-lg text-muted-foreground line-through">
                      ¥{pkg.originalPrice}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-lg font-semibold text-primary-600 dark:text-primary-400">
                  {pkg.credits} {t("credits")}
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {feature.replace("{credits}", pkg.credits.toString())}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={creating && selectedPackage?.id === pkg.id}
                className={`w-full py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  pkg.isPopular
                    ? "bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white shadow-lg"
                    : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {creating && selectedPackage?.id === pkg.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {t("buyNow")}
              </button>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="bg-white dark:bg-card rounded-2xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t("paymentMethods")}
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#07C160">
                <path d="M8.691 11.326c.36-.08.8-.17 1.24-.17.44 0 .88.09 1.24.17.36.08.62.44.62.81 0 .37-.26.69-.62.77-.36.08-.8.17-1.24.17-.44 0-.88-.09-1.24-.17-.36-.08-.62-.4-.62-.77 0-.37.26-.73.62-.81zm6.618 0c.36-.08.8-.17 1.24-.17.44 0 .88.09 1.24.17.36.08.62.44.62.81 0 .37-.26.69-.62.77-.36.08-.8.17-1.24.17-.44 0-.88-.09-1.24-.17-.36-.08-.62-.4-.62-.77 0-.37.26-.73.62-.81zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
              </svg>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {t("wechatPay")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {(currentOrder || paymentInfo) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card rounded-2xl p-8 max-w-sm w-full mx-4 relative">
            <button
              onClick={closePaymentModal}
              className="absolute top-4 right-4 p-1 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="text-center">
              {/* Native Payment: QR Code */}
              {paymentInfo?.type === "native" && paymentInfo.codeUrl && (
                <>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {t("scanToPay")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {t("useWechatScan")}
                  </p>

                  <div className="bg-white p-4 rounded-xl border border-border mb-4 inline-block">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentInfo.codeUrl)}`}
                      alt="Payment QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </>
              )}

              {/* H5 Payment: Guide */}
              {paymentInfo?.type === "h5" && (
                <>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {locale === "zh" ? "微信支付" : "WeChat Pay"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {locale === "zh"
                      ? "请在弹出的页面中完成支付，如果没有自动打开，请点击下方按钮"
                      : "Please complete payment in the popup. If it didn't open, click the button below"}
                  </p>

                  <div className="mb-6">
                    <button
                      onClick={openH5Payment}
                      className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 mx-auto"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.691 11.326c.36-.08.8-.17 1.24-.17.44 0 .88.09 1.24.17.36.08.62.44.62.81 0 .37-.26.69-.62.77-.36.08-.8.17-1.24.17-.44 0-.88-.09-1.24-.17-.36-.08-.62-.4-.62-.77 0-.37.26-.73.62-.81zm6.618 0c.36-.08.8-.17 1.24-.17.44 0 .88.09 1.24.17.36.08.62.44.62.81 0 .37-.26.69-.62.77-.36.08-.8.17-1.24.17-.44 0-.88-.09-1.24-.17-.36-.08-.62-.4-.62-.77 0-.37.26-.73.62-.81zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
                      </svg>
                      {locale === "zh" ? "打开微信支付" : "Open WeChat Pay"}
                    </button>
                  </div>
                </>
              )}

              {/* No Payment Info */}
              {!paymentInfo && (
                <div className="py-8">
                  <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {locale === "zh"
                      ? "正在创建支付订单..."
                      : "Creating payment order..."}
                  </p>
                </div>
              )}

              {/* Order Info */}
              {currentOrder && (
                <div className="text-sm text-muted-foreground space-y-1 mb-4">
                  <p>{t("orderNo")}: {currentOrder.orderNo}</p>
                  <p>{t("amount")}: ¥{currentOrder.amount}</p>
                  <p>{t("credits")}: {currentOrder.credits}</p>
                </div>
              )}

              {/* Polling Status */}
              {polling && (
                <div className="flex items-center justify-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t("waitingPayment")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
