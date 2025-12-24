import { NextRequest, NextResponse } from "next/server";
import {
  verifyNotifySignature,
  parseNotification,
  WechatPayNotification,
} from "@/lib/wechat-pay";
import {
  getOrderByOrderNo,
  updateOrderStatus,
  addUserCredits,
} from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Get headers for signature verification
    const timestamp = request.headers.get("Wechatpay-Timestamp") || "";
    const nonce = request.headers.get("Wechatpay-Nonce") || "";
    const signature = request.headers.get("Wechatpay-Signature") || "";
    const serialNo = request.headers.get("Wechatpay-Serial") || "";

    // Get request body
    const bodyText = await request.text();

    // Verify signature
    const isValid = verifyNotifySignature(
      timestamp,
      nonce,
      bodyText,
      signature,
      serialNo
    );

    if (!isValid) {
      console.error("Invalid WeChat Pay notification signature");
      return NextResponse.json(
        { code: "FAIL", message: "Signature verification failed" },
        { status: 400 }
      );
    }

    // Parse notification
    const notification: WechatPayNotification = JSON.parse(bodyText);

    // Check event type
    if (notification.event_type !== "TRANSACTION.SUCCESS") {
      console.log("Non-payment notification:", notification.event_type);
      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }

    // Decrypt and parse payment result
    const paymentResult = parseNotification(notification);

    if (!paymentResult) {
      console.error("Failed to parse payment notification");
      return NextResponse.json(
        { code: "FAIL", message: "Failed to parse notification" },
        { status: 400 }
      );
    }

    // Check trade state
    if (paymentResult.trade_state !== "SUCCESS") {
      console.log("Non-success payment:", paymentResult.trade_state);
      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }

    const orderNo = paymentResult.out_trade_no;
    const transactionId = paymentResult.transaction_id;

    // Get order
    const order = await getOrderByOrderNo(orderNo);

    if (!order) {
      console.error("Order not found:", orderNo);
      return NextResponse.json(
        { code: "FAIL", message: "Order not found" },
        { status: 404 }
      );
    }

    // Check if already processed
    if (order.status === "paid") {
      console.log("Order already processed:", orderNo);
      return NextResponse.json({ code: "SUCCESS", message: "OK" });
    }

    // Update order status
    await updateOrderStatus(orderNo, "paid", transactionId);

    // Add credits to user
    await addUserCredits(order.user_id, order.credits);

    console.log(`Payment success: Order ${orderNo}, Credits ${order.credits} added to user ${order.user_id}`);

    return NextResponse.json({ code: "SUCCESS", message: "OK" });
  } catch (error) {
    console.error("WeChat Pay notify error:", error);
    return NextResponse.json(
      { code: "FAIL", message: "Internal server error" },
      { status: 500 }
    );
  }
}
