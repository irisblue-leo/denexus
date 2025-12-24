import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createOrder,
  getPackageById,
  generateId,
  generateOrderNo,
} from "@/lib/db";
import { createNativeOrder } from "@/lib/wechat-pay";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { packageId } = body;

    if (!packageId) {
      return NextResponse.json(
        { error: "Package ID is required" },
        { status: 400 }
      );
    }

    // Get package details
    const pkg = await getPackageById(packageId);
    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }

    // Free package doesn't need payment
    if (Number(pkg.price) === 0) {
      return NextResponse.json(
        { error: "Free package does not require payment" },
        { status: 400 }
      );
    }

    // Create order
    const orderId = generateId("order");
    const orderNo = generateOrderNo();
    const amount = Number(pkg.price);

    const order = await createOrder({
      id: orderId,
      orderNo,
      userId: user.id,
      packageId: pkg.id,
      credits: pkg.credits,
      amount,
      paymentMethod: "wechat",
    });

    // Create WeChat Pay native order
    try {
      const wechatOrder = await createNativeOrder({
        description: `Denexus ${pkg.name} - ${pkg.credits} Credits`,
        outTradeNo: orderNo,
        totalAmount: Math.round(amount * 100), // Convert to cents
      });

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNo: order.order_no,
          credits: order.credits,
          amount: Number(order.amount),
          status: order.status,
          expireAt: order.expire_at,
        },
        payment: {
          codeUrl: wechatOrder.codeUrl,
        },
      });
    } catch (paymentError) {
      console.error("WeChat Pay error:", paymentError);

      // Return order info even if WeChat Pay fails (for testing)
      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNo: order.order_no,
          credits: order.credits,
          amount: Number(order.amount),
          status: order.status,
          expireAt: order.expire_at,
        },
        payment: {
          error: "Payment service temporarily unavailable",
          // For testing: provide a mock QR code URL
          codeUrl: null,
        },
      });
    }
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
