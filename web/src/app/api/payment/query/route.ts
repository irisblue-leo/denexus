import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrderByOrderNo, updateOrderStatus, addUserCredits } from "@/lib/db";
import { queryOrder } from "@/lib/wechat-pay";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderNo = searchParams.get("orderNo");

    if (!orderNo) {
      return NextResponse.json(
        { error: "Order number is required" },
        { status: 400 }
      );
    }

    // Get order from database
    const order = await getOrderByOrderNo(orderNo);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if user owns this order
    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // If order is already paid, return current status
    if (order.status === "paid") {
      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNo: order.order_no,
          credits: order.credits,
          amount: Number(order.amount),
          status: order.status,
          paidAt: order.paid_at,
        },
      });
    }

    // Query WeChat Pay for latest status
    try {
      const paymentResult = await queryOrder(orderNo);

      if (paymentResult && paymentResult.trade_state === "SUCCESS") {
        // Update order status
        await updateOrderStatus(orderNo, "paid", paymentResult.transaction_id);

        // Add credits to user
        await addUserCredits(order.user_id, order.credits);

        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            orderNo: order.order_no,
            credits: order.credits,
            amount: Number(order.amount),
            status: "paid",
            paidAt: new Date(),
          },
        });
      }

      // Check if order expired
      if (order.expire_at && new Date(order.expire_at) < new Date()) {
        if (order.status !== "expired") {
          await updateOrderStatus(orderNo, "expired");
        }

        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            orderNo: order.order_no,
            credits: order.credits,
            amount: Number(order.amount),
            status: "expired",
          },
        });
      }

      // Return current status
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
      });
    } catch (queryError) {
      console.error("Query WeChat Pay error:", queryError);

      // Return database status if WeChat Pay query fails
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
      });
    }
  } catch (error) {
    console.error("Query order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
