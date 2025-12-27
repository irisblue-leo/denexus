import { NextRequest, NextResponse } from "next/server";
import { verifySign } from "@/lib/alipay";
import {
  getOrderByOrderNo,
  updateOrderStatus,
  addUserCredits,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Get form data from Alipay notification
    const formData = await request.formData();
    const params: Record<string, string> = {};

    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    console.log("Alipay notification received:", JSON.stringify(params));

    // Verify signature
    if (!verifySign(params)) {
      console.error("Invalid Alipay notification signature");
      return new NextResponse("fail", { status: 400 });
    }

    // Check trade status
    const tradeStatus = params.trade_status;
    if (tradeStatus !== "TRADE_SUCCESS" && tradeStatus !== "TRADE_FINISHED") {
      console.log("Non-success trade status:", tradeStatus);
      return new NextResponse("success");
    }

    const orderNo = params.out_trade_no;
    const transactionId = params.trade_no;

    // Get order
    const order = await getOrderByOrderNo(orderNo);

    if (!order) {
      console.error("Order not found:", orderNo);
      return new NextResponse("fail", { status: 404 });
    }

    // Check if already processed
    if (order.status === "paid") {
      console.log("Order already processed:", orderNo);
      return new NextResponse("success");
    }

    // Update order status
    await updateOrderStatus(orderNo, "paid", transactionId);

    // Add credits to user
    await addUserCredits(order.user_id, order.credits);

    console.log(`Alipay payment success: Order ${orderNo}, Credits ${order.credits} added to user ${order.user_id}`);

    // Return success to Alipay
    return new NextResponse("success");
  } catch (error) {
    console.error("Alipay notify error:", error);
    return new NextResponse("fail", { status: 500 });
  }
}
