import { NextRequest, NextResponse } from "next/server";
import { generateVerificationCode, storeCode } from "@/lib/auth";
import { checkRateLimit } from "@/lib/redis";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, locale = "zh" } = body;

    const identifier = phone || email;
    if (!identifier) {
      return NextResponse.json(
        { error: "Phone or email is required" },
        { status: 400 }
      );
    }

    // Rate limiting: max 5 requests per 5 minutes per identifier
    const rateLimit = await checkRateLimit(`send_code:${identifier}`, 5, 300);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Generate and store code in Redis
    const code = generateVerificationCode();
    await storeCode(identifier, code);

    // Send verification code
    if (email) {
      // Send email
      const sent = await sendVerificationEmail(email, code, locale);
      if (!sent) {
        return NextResponse.json(
          { error: "Failed to send verification email" },
          { status: 500 }
        );
      }
      console.log(`Verification email sent to ${email}`);
    } else if (phone) {
      // For SMS, log to console for now (integrate SMS provider later)
      console.log(`Verification code for ${phone}: ${code}`);
    }

    return NextResponse.json({
      success: true,
      message: email ? "Verification email sent" : "Verification code sent",
      // Only include code in development for testing (phone only)
      ...(process.env.NODE_ENV !== "production" && phone && { code }),
    });
  } catch (error) {
    console.error("Send code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
