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
  type: "native" | "h5" | "alipay";
  codeUrl?: string;
  h5Url?: string;
  paymentUrl?: string;
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
  const [paymentChannel, setPaymentChannel] = useState<"wechat" | "alipay">("wechat");

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
        body: JSON.stringify({ packageId: pkg.id, paymentChannel }),
      });

      const data = await response.json();

      if (data.success && data.payment) {
        setCurrentOrder(data.order);
        setPaymentInfo(data.payment);

        if (data.payment.type === "alipay" && data.payment.paymentUrl) {
          // Alipay: redirect to payment page
          startPolling(data.order.orderNo);
          window.open(data.payment.paymentUrl, "_blank");
        } else if (data.payment.type === "h5" && data.payment.h5Url) {
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

  const openAlipayPayment = () => {
    if (paymentInfo?.paymentUrl) {
      window.open(paymentInfo.paymentUrl, "_blank");
    }
  };

  const getPackageName = (pkg: Package) => {
    return locale === "zh" ? pkg.name : pkg.nameEn;
  };

  const getPackageDescription = (pkg: Package) => {
    return locale === "zh" ? pkg.description : pkg.descriptionEn;
  };

  if (loading) {
    return (
      <div className="p-6 h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            {t("buyCreditsTitle")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("buyCreditsDescription")}
          </p>
          <div className="mt-3 md:mt-4 inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-full">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span className="text-xs md:text-sm font-medium text-primary-600 dark:text-primary-400">
              {t("currentCredits")}: {user?.credits || 0}
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-10">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-white dark:bg-card rounded-2xl border-2 p-4 md:p-6 transition-all ${
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
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {t("feature1", { credits: pkg.credits })}
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {t("feature2")}
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {t("feature3")}
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {t("feature4")}
                </li>
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
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setPaymentChannel("wechat")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                paymentChannel === "wechat"
                  ? "bg-green-50 dark:bg-green-900/20 border-green-500 ring-2 ring-green-500/20"
                  : "bg-secondary/50 border-border hover:border-green-300"
              }`}
            >
              {/* WeChat Pay Icon - Bootstrap Icons */}
              <svg className="w-6 h-6" viewBox="0 0 16 16" fill="#07C160">
                <path d="M11.176 14.429c-2.665 0-4.826-1.8-4.826-4.018 0-2.22 2.159-4.02 4.824-4.02S16 8.191 16 10.411c0 1.21-.65 2.301-1.666 3.036a.32.32 0 0 0-.12.366l.218.81a.6.6 0 0 1 .029.117.166.166 0 0 1-.162.162.2.2 0 0 1-.092-.03l-1.057-.61a.5.5 0 0 0-.256-.074.5.5 0 0 0-.142.021 5.7 5.7 0 0 1-1.576.22M9.064 9.542a.647.647 0 1 0 .557-1 .645.645 0 0 0-.646.647.6.6 0 0 0 .09.353Zm3.232.001a.646.646 0 1 0 .546-1 .645.645 0 0 0-.644.644.63.63 0 0 0 .098.356"/>
                <path d="M0 6.826c0 1.455.781 2.765 2.001 3.656a.385.385 0 0 1 .143.439l-.161.6-.1.373a.5.5 0 0 0-.032.14.19.19 0 0 0 .193.193q.06 0 .111-.029l1.268-.733a.6.6 0 0 1 .308-.088q.088 0 .171.025a6.8 6.8 0 0 0 1.625.26 4.5 4.5 0 0 1-.177-1.251c0-2.936 2.785-5.02 5.824-5.02l.15.002C10.587 3.429 8.392 2 5.796 2 2.596 2 0 4.16 0 6.826m4.632-1.555a.77.77 0 1 1-1.54 0 .77.77 0 0 1 1.54 0m3.875 0a.77.77 0 1 1-1.54 0 .77.77 0 0 1 1.54 0"/>
              </svg>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {t("wechatPay")}
              </span>
            </button>
            <button
              onClick={() => setPaymentChannel("alipay")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                paymentChannel === "alipay"
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-2 ring-blue-500/20"
                  : "bg-secondary/50 border-border hover:border-blue-300"
              }`}
            >
              {/* Alipay Icon - Bootstrap Icons */}
              <svg className="w-6 h-6" viewBox="0 0 16 16" fill="#1677FF">
                <path d="M2.541 0H13.5a2.55 2.55 0 0 1 2.54 2.563v8.297c-.006 0-.531-.046-2.978-.813-.412-.14-.916-.327-1.479-.536q-.456-.17-.957-.353a13 13 0 0 0 1.325-3.373H8.822V4.649h3.831v-.634h-3.83V2.121H7.26c-.274 0-.274.273-.274.273v1.621H3.11v.634h3.875v1.136h-3.2v.634H9.99c-.227.789-.532 1.53-.894 2.202-2.013-.67-4.161-1.212-5.51-.878-.864.214-1.42.597-1.746.998-1.499 1.84-.424 4.633 2.741 4.633 1.872 0 3.675-1.053 5.072-2.787 2.08 1.008 6.37 2.738 6.387 2.745v.105A2.55 2.55 0 0 1 13.5 16H2.541A2.55 2.55 0 0 1 0 13.437V2.563A2.55 2.55 0 0 1 2.541 0"/>
                <path d="M2.309 9.27c-1.22 1.073-.49 3.034 1.978 3.034 1.434 0 2.868-.925 3.994-2.406-1.602-.789-2.959-1.353-4.425-1.207-.397.04-1.14.217-1.547.58Z"/>
              </svg>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {t("alipay")}
              </span>
            </button>
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
                      <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.176 14.429c-2.665 0-4.826-1.8-4.826-4.018 0-2.22 2.159-4.02 4.824-4.02S16 8.191 16 10.411c0 1.21-.65 2.301-1.666 3.036a.32.32 0 0 0-.12.366l.218.81a.6.6 0 0 1 .029.117.166.166 0 0 1-.162.162.2.2 0 0 1-.092-.03l-1.057-.61a.5.5 0 0 0-.256-.074.5.5 0 0 0-.142.021 5.7 5.7 0 0 1-1.576.22M9.064 9.542a.647.647 0 1 0 .557-1 .645.645 0 0 0-.646.647.6.6 0 0 0 .09.353Zm3.232.001a.646.646 0 1 0 .546-1 .645.645 0 0 0-.644.644.63.63 0 0 0 .098.356"/>
                        <path d="M0 6.826c0 1.455.781 2.765 2.001 3.656a.385.385 0 0 1 .143.439l-.161.6-.1.373a.5.5 0 0 0-.032.14.19.19 0 0 0 .193.193q.06 0 .111-.029l1.268-.733a.6.6 0 0 1 .308-.088q.088 0 .171.025a6.8 6.8 0 0 0 1.625.26 4.5 4.5 0 0 1-.177-1.251c0-2.936 2.785-5.02 5.824-5.02l.15.002C10.587 3.429 8.392 2 5.796 2 2.596 2 0 4.16 0 6.826m4.632-1.555a.77.77 0 1 1-1.54 0 .77.77 0 0 1 1.54 0m3.875 0a.77.77 0 1 1-1.54 0 .77.77 0 0 1 1.54 0"/>
                      </svg>
                      {locale === "zh" ? "打开微信支付" : "Open WeChat Pay"}
                    </button>
                  </div>
                </>
              )}

              {/* Alipay Payment: Guide */}
              {paymentInfo?.type === "alipay" && (
                <>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {locale === "zh" ? "支付宝支付" : "Alipay"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {locale === "zh"
                      ? "请在弹出的页面中完成支付，如果没有自动打开，请点击下方按钮"
                      : "Please complete payment in the popup. If it didn't open, click the button below"}
                  </p>

                  <div className="mb-6">
                    <button
                      onClick={openAlipayPayment}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 mx-auto"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2.541 0H13.5a2.55 2.55 0 0 1 2.54 2.563v8.297c-.006 0-.531-.046-2.978-.813-.412-.14-.916-.327-1.479-.536q-.456-.17-.957-.353a13 13 0 0 0 1.325-3.373H8.822V4.649h3.831v-.634h-3.83V2.121H7.26c-.274 0-.274.273-.274.273v1.621H3.11v.634h3.875v1.136h-3.2v.634H9.99c-.227.789-.532 1.53-.894 2.202-2.013-.67-4.161-1.212-5.51-.878-.864.214-1.42.597-1.746.998-1.499 1.84-.424 4.633 2.741 4.633 1.872 0 3.675-1.053 5.072-2.787 2.08 1.008 6.37 2.738 6.387 2.745v.105A2.55 2.55 0 0 1 13.5 16H2.541A2.55 2.55 0 0 1 0 13.437V2.563A2.55 2.55 0 0 1 2.541 0"/>
                        <path d="M2.309 9.27c-1.22 1.073-.49 3.034 1.978 3.034 1.434 0 2.868-.925 3.994-2.406-1.602-.789-2.959-1.353-4.425-1.207-.397.04-1.14.217-1.547.58Z"/>
                      </svg>
                      {locale === "zh" ? "打开支付宝支付" : "Open Alipay"}
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
