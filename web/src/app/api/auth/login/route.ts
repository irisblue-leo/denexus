import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  getDbUserByEmailOrPhone,
  getDbUserByPhone,
  createToken,
  setAuthCookie,
  verifyCode,
  createUser,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailOrPhone, password, phone, verifyCode: code, loginMethod } = body;

    if (loginMethod === "password") {
      // Password login
      if (!emailOrPhone || !password) {
        return NextResponse.json(
          { error: "Email/phone and password are required" },
          { status: 400 }
        );
      }

      const user = await getDbUserByEmailOrPhone(emailOrPhone);
      if (!user || !user.password) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      // Create token and set cookie
      const token = await createToken({
        userId: user.id,
        phone: user.phone,
        email: user.email,
      });
      await setAuthCookie(token);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          credits: user.credits,
        },
      });
    } else if (loginMethod === "sms") {
      // SMS login
      if (!phone || !code) {
        return NextResponse.json(
          { error: "Phone number and verification code are required" },
          { status: 400 }
        );
      }

      // Verify the code
      const isValidCode = await verifyCode(phone, code);
      if (!isValidCode) {
        return NextResponse.json(
          { error: "Invalid or expired verification code" },
          { status: 400 }
        );
      }

      let user = await getDbUserByPhone(phone);

      // Auto-register if user doesn't exist (for SMS login)
      if (!user) {
        const newUser = await createUser({ phone });
        user = {
          id: newUser.id,
          phone: newUser.phone,
          email: newUser.email,
          password: null,
          credits: newUser.credits,
          created_at: newUser.createdAt || new Date(),
          updated_at: new Date(),
        };
      }

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
    }

    return NextResponse.json(
      { error: "Invalid login method" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
