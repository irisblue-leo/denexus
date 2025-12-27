import crypto from "crypto";

const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID || "";
const ALIPAY_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY || "";
const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY || "";
const ALIPAY_GATEWAY = process.env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do";
const ALIPAY_NOTIFY_URL = process.env.ALIPAY_NOTIFY_URL || "";
const ALIPAY_RETURN_URL = process.env.ALIPAY_RETURN_URL || "";

// Check if Alipay is configured
export function isAlipayConfigured(): boolean {
  return !!(ALIPAY_APP_ID && ALIPAY_PRIVATE_KEY && ALIPAY_PUBLIC_KEY);
}

// Format private key for crypto
function formatPrivateKey(privateKey: string): string {
  const key = privateKey.replace(/\s/g, "");
  if (key.includes("-----BEGIN")) return key;

  const lines = [];
  lines.push("-----BEGIN RSA PRIVATE KEY-----");
  for (let i = 0; i < key.length; i += 64) {
    lines.push(key.substring(i, i + 64));
  }
  lines.push("-----END RSA PRIVATE KEY-----");
  return lines.join("\n");
}

// Format public key for crypto
function formatPublicKey(publicKey: string): string {
  const key = publicKey.replace(/\s/g, "");
  if (key.includes("-----BEGIN")) return key;

  const lines = [];
  lines.push("-----BEGIN PUBLIC KEY-----");
  for (let i = 0; i < key.length; i += 64) {
    lines.push(key.substring(i, i + 64));
  }
  lines.push("-----END PUBLIC KEY-----");
  return lines.join("\n");
}

// Generate signature
function sign(params: Record<string, string>): string {
  // Sort parameters alphabetically
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys
    .filter((key) => params[key] !== undefined && params[key] !== "")
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const privateKey = formatPrivateKey(ALIPAY_PRIVATE_KEY);
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signStr, "utf8");
  return signer.sign(privateKey, "base64");
}

// Verify signature from Alipay
export function verifySign(params: Record<string, string>): boolean {
  const { sign: signature, sign_type, ...rest } = params;
  if (!signature) return false;

  const sortedKeys = Object.keys(rest).sort();
  const signStr = sortedKeys
    .filter((key) => rest[key] !== undefined && rest[key] !== "")
    .map((key) => `${key}=${rest[key]}`)
    .join("&");

  const publicKey = formatPublicKey(ALIPAY_PUBLIC_KEY);
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signStr, "utf8");

  try {
    return verifier.verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

// Create page payment (PC web)
export async function createPagePayment(options: {
  outTradeNo: string;
  totalAmount: number; // In yuan
  subject: string;
  body?: string;
}): Promise<string> {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);

  const bizContent = {
    out_trade_no: options.outTradeNo,
    total_amount: options.totalAmount.toFixed(2),
    subject: options.subject,
    body: options.body || options.subject,
    product_code: "FAST_INSTANT_TRADE_PAY",
  };

  const params: Record<string, string> = {
    app_id: ALIPAY_APP_ID,
    method: "alipay.trade.page.pay",
    format: "JSON",
    return_url: ALIPAY_RETURN_URL,
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp,
    version: "1.0",
    notify_url: ALIPAY_NOTIFY_URL,
    biz_content: JSON.stringify(bizContent),
  };

  params.sign = sign(params);

  // Build payment URL
  const query = Object.keys(params)
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");

  return `${ALIPAY_GATEWAY}?${query}`;
}

// Create WAP payment (mobile web)
export async function createWapPayment(options: {
  outTradeNo: string;
  totalAmount: number; // In yuan
  subject: string;
  body?: string;
  quitUrl?: string;
}): Promise<string> {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);

  const bizContent = {
    out_trade_no: options.outTradeNo,
    total_amount: options.totalAmount.toFixed(2),
    subject: options.subject,
    body: options.body || options.subject,
    product_code: "QUICK_WAP_WAY",
    quit_url: options.quitUrl || ALIPAY_RETURN_URL,
  };

  const params: Record<string, string> = {
    app_id: ALIPAY_APP_ID,
    method: "alipay.trade.wap.pay",
    format: "JSON",
    return_url: ALIPAY_RETURN_URL,
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp,
    version: "1.0",
    notify_url: ALIPAY_NOTIFY_URL,
    biz_content: JSON.stringify(bizContent),
  };

  params.sign = sign(params);

  // Build payment URL
  const query = Object.keys(params)
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");

  return `${ALIPAY_GATEWAY}?${query}`;
}

// Query order status
export async function queryOrder(outTradeNo: string): Promise<{
  success: boolean;
  tradeStatus?: string;
  tradeNo?: string;
  totalAmount?: string;
}> {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);

  const bizContent = {
    out_trade_no: outTradeNo,
  };

  const params: Record<string, string> = {
    app_id: ALIPAY_APP_ID,
    method: "alipay.trade.query",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp,
    version: "1.0",
    biz_content: JSON.stringify(bizContent),
  };

  params.sign = sign(params);

  try {
    const response = await fetch(ALIPAY_GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });

    const data = await response.json();
    const result = data.alipay_trade_query_response;

    if (result.code === "10000") {
      return {
        success: true,
        tradeStatus: result.trade_status,
        tradeNo: result.trade_no,
        totalAmount: result.total_amount,
      };
    }

    return { success: false };
  } catch (error) {
    console.error("Alipay query error:", error);
    return { success: false };
  }
}
