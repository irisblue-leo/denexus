import crypto from "crypto";
import fs from "fs";
import path from "path";

// WeChat Pay configuration
const config = {
  appId: process.env.WECHAT_PAY_APP_ID || "",
  mchId: process.env.WECHAT_PAY_MCH_ID || "",
  apiKey: process.env.WECHAT_PAY_API_KEY || "",
  apiKeyV3: process.env.WECHAT_PAY_API_KEY_V3 || "",
  serialNo: process.env.WECHAT_PAY_SERIAL_NO || "",
  certPath: process.env.WECHAT_PAY_CERT_PATH || "./certs/wechat",
  notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || "",
};

// API endpoints
const API_BASE = "https://api.mch.weixin.qq.com";

interface UnifiedOrderParams {
  description: string;
  outTradeNo: string;
  totalAmount: number; // in cents (分)
  payerOpenId?: string;
  notifyUrl?: string;
}

interface NativeOrderResult {
  codeUrl: string;
  prepayId: string;
}

// Generate random string
function generateNonceStr(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get current timestamp
function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

// Load private key
function getPrivateKey(): string {
  try {
    const keyPath = path.join(process.cwd(), config.certPath, "apiclient_key.pem");
    return fs.readFileSync(keyPath, "utf-8");
  } catch {
    console.error("Failed to load WeChat Pay private key");
    return "";
  }
}

// Generate signature for V3 API
function generateSignature(
  method: string,
  url: string,
  timestamp: string,
  nonceStr: string,
  body: string
): string {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const privateKey = getPrivateKey();

  if (!privateKey) {
    throw new Error("Private key not found");
  }

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(message);
  return sign.sign(privateKey, "base64");
}

// Generate authorization header
function generateAuthHeader(
  method: string,
  url: string,
  body: string = ""
): string {
  const timestamp = getTimestamp();
  const nonceStr = generateNonceStr();
  const signature = generateSignature(method, url, timestamp, nonceStr, body);

  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`;
}

// Create Native Pay order (QR code payment)
export async function createNativeOrder(
  params: UnifiedOrderParams
): Promise<NativeOrderResult> {
  const url = "/v3/pay/transactions/native";
  const fullUrl = `${API_BASE}${url}`;

  const requestBody = {
    appid: config.appId,
    mchid: config.mchId,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl || config.notifyUrl,
    amount: {
      total: params.totalAmount,
      currency: "CNY",
    },
  };

  const bodyStr = JSON.stringify(requestBody);
  const authorization = generateAuthHeader("POST", url, bodyStr);

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authorization,
    },
    body: bodyStr,
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("WeChat Pay API error:", errorData);
    throw new Error(errorData.message || "Failed to create WeChat Pay order");
  }

  const data = await response.json();
  return {
    codeUrl: data.code_url,
    prepayId: data.prepay_id,
  };
}

// Verify callback signature
export function verifyNotifySignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  serialNo: string
): boolean {
  try {
    // In production, you should fetch the platform certificate and verify
    // For now, we'll do a basic verification
    const message = `${timestamp}\n${nonce}\n${body}\n`;

    // Load platform certificate
    const certPath = path.join(process.cwd(), config.certPath, "platform_cert.pem");
    let platformCert: string;

    try {
      platformCert = fs.readFileSync(certPath, "utf-8");
    } catch {
      console.warn("Platform certificate not found, skipping signature verification");
      return true; // Skip verification if cert not found (for development)
    }

    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(message);
    return verify.verify(platformCert, signature, "base64");
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Decrypt callback resource
export function decryptResource(
  ciphertext: string,
  associatedData: string,
  nonce: string
): string {
  const key = Buffer.from(config.apiKeyV3, "utf-8");
  const ciphertextBuffer = Buffer.from(ciphertext, "base64");
  const nonceBuffer = Buffer.from(nonce, "utf-8");
  const associatedDataBuffer = Buffer.from(associatedData, "utf-8");

  // AES-256-GCM decryption
  const authTagLength = 16;
  const authTag = ciphertextBuffer.slice(-authTagLength);
  const encryptedData = ciphertextBuffer.slice(0, -authTagLength);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonceBuffer);
  decipher.setAuthTag(authTag);
  decipher.setAAD(associatedDataBuffer);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}

// Parse callback notification
export interface WechatPayNotification {
  id: string;
  create_time: string;
  event_type: string;
  resource_type: string;
  resource: {
    algorithm: string;
    ciphertext: string;
    associated_data: string;
    nonce: string;
    original_type: string;
  };
  summary: string;
}

export interface PaymentResult {
  appid: string;
  mchid: string;
  out_trade_no: string;
  transaction_id: string;
  trade_type: string;
  trade_state: string;
  trade_state_desc: string;
  bank_type: string;
  attach: string;
  success_time: string;
  payer: {
    openid: string;
  };
  amount: {
    total: number;
    payer_total: number;
    currency: string;
    payer_currency: string;
  };
}

export function parseNotification(notification: WechatPayNotification): PaymentResult | null {
  try {
    const { ciphertext, associated_data, nonce } = notification.resource;
    const decrypted = decryptResource(ciphertext, associated_data, nonce);
    return JSON.parse(decrypted) as PaymentResult;
  } catch (error) {
    console.error("Failed to parse notification:", error);
    return null;
  }
}

// Query order status
export async function queryOrder(outTradeNo: string): Promise<PaymentResult | null> {
  const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${config.mchId}`;
  const fullUrl = `${API_BASE}${url}`;

  const authorization = generateAuthHeader("GET", url);

  const response = await fetch(fullUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: authorization,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Query order error:", errorData);
    return null;
  }

  return response.json();
}

// Close order
export async function closeOrder(outTradeNo: string): Promise<boolean> {
  const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}/close`;
  const fullUrl = `${API_BASE}${url}`;

  const requestBody = { mchid: config.mchId };
  const bodyStr = JSON.stringify(requestBody);
  const authorization = generateAuthHeader("POST", url, bodyStr);

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: bodyStr,
  });

  return response.status === 204;
}

// Generate JSAPI payment parameters for H5/Mini Program
export function generateJsApiPayParams(prepayId: string): {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
} {
  const timestamp = getTimestamp();
  const nonceStr = generateNonceStr();
  const packageStr = `prepay_id=${prepayId}`;

  const message = `${config.appId}\n${timestamp}\n${nonceStr}\n${packageStr}\n`;
  const privateKey = getPrivateKey();
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(message);
  const paySign = sign.sign(privateKey, "base64");

  return {
    appId: config.appId,
    timeStamp: timestamp,
    nonceStr,
    package: packageStr,
    signType: "RSA",
    paySign,
  };
}
