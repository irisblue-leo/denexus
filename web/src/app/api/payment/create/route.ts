import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createOrder,
  getPackageById,
  generateId,
  generateOrderNo,
} from "@/lib/db";
import { createNativeOrder, createH5Order } from "@/lib/wechat-pay";

// Get client IP from request
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (cfConnectingIp) return cfConnectingIp;
  if (forwarded) return forwarded.split(",")[0].trim();
  if (realIp) return realIp;
  return "127.0.0.1";
}

// Detect if request is from mobile
function isMobileRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get("user-agent") || "";
  return /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(userAgent);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { packageId, paymentMethod = "auto" } = body; // paymentMethod: "auto" | "native" | "h5"
    const clientIp = getClientIp(request);
    const isMobile = isMobileRequest(request);

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

    // Determine which payment method to use
    const useH5 = paymentMethod === "h5" || (paymentMethod === "auto" && isMobile);
    const description = `Denexus ${pkg.name} - ${pkg.credits} Credits`;
    const totalAmount = Math.round(amount * 100); // Convert to cents

    // Try the primary payment method first
    try {
      if (useH5) {
        // Try H5 payment first for mobile users
        const h5Order = await createH5Order({
          description,
          outTradeNo: orderNo,
          totalAmount,
          payerClientIp: clientIp,
          sceneType: "Wap",
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
            type: "h5",
            h5Url: h5Order.h5Url,
          },
        });
      } else {
        // Try Native payment for desktop users
        const nativeOrder = await createNativeOrder({
          description,
          outTradeNo: orderNo,
          totalAmount,
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
            type: "native",
            codeUrl: nativeOrder.codeUrl,
          },
        });
      }
    } catch (primaryError) {
      console.error(`WeChat ${useH5 ? "H5" : "Native"} Pay error:`, primaryError);

      // Try the alternative payment method as fallback
      try {
        if (useH5) {
          // Fallback to Native payment
          const nativeOrder = await createNativeOrder({
            description,
            outTradeNo: orderNo,
            totalAmount,
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
              type: "native",
              codeUrl: nativeOrder.codeUrl,
            },
          });
        } else {
          // Fallback to H5 payment
          const h5Order = await createH5Order({
            description,
            outTradeNo: orderNo,
            totalAmount,
            payerClientIp: clientIp,
            sceneType: "Wap",
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
              type: "h5",
              h5Url: h5Order.h5Url,
            },
          });
        }
      } catch (fallbackError) {
        console.error("WeChat Pay fallback error:", fallbackError);

        // Both methods failed, return error
        return NextResponse.json({
          success: false,
          error: "微信支付服务暂时不可用，请稍后重试或联系客服",
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
    }
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
