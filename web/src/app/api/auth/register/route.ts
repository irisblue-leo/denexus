import { NextRequest, NextResponse } from "next/server";
import {
  hashPassword,
  createUser,
  getUserByPhone,
  getUserByEmail,
  createToken,
  setAuthCookie,
  verifyCode,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, password, verifyCode: code, registerMethod } = body;

    // Validate required fields
    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (registerMethod === "phone") {
      if (!phone) {
        return NextResponse.json(
          { error: "Phone number is required" },
          { status: 400 }
        );
      }

      // Verify the code
      if (!code) {
        return NextResponse.json(
          { error: "Verification code is required" },
          { status: 400 }
        );
      }

      const isValidCode = await verifyCode(phone, code);
      if (!isValidCode) {
        return NextResponse.json(
          { error: "Invalid or expired verification code" },
          { status: 400 }
        );
      }

      // Check if phone already exists
      const existingUser = await getUserByPhone(phone);
      if (existingUser) {
        return NextResponse.json(
          { error: "Phone number already registered" },
          { status: 400 }
        );
      }

      // Create user
      const hashedPassword = await hashPassword(password);
      const user = await createUser({
        phone,
        password: hashedPassword,
      });

      // Create token and set cookie
      const token = await createToken({
        userId: user.id,
        phone: user.phone,
      });
      await setAuthCookie(token);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          credits: user.credits,
        },
      });
    } else if (registerMethod === "email") {
      if (!email) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 }
        );
      }

      // Verify the code
      if (!code) {
        return NextResponse.json(
          { error: "Verification code is required" },
          { status: 400 }
        );
      }

      const isValidCode = await verifyCode(email, code);
      if (!isValidCode) {
        return NextResponse.json(
          { error: "Invalid or expired verification code" },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        );
      }

      // Create user
      const hashedPassword = await hashPassword(password);
      const user = await createUser({
        email,
        password: hashedPassword,
      });

      // Create token and set cookie
      const token = await createToken({
        userId: user.id,
        email: user.email,
      });
      await setAuthCookie(token);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          credits: user.credits,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid register method" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
