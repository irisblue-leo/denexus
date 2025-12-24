import nodemailer from "nodemailer";

// SMTP configuration
const config = {
  host: process.env.SMTP_HOST || "smtp.qq.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true, // use SSL
  auth: {
    user: process.env.SMTP_USERNAME || "",
    pass: process.env.SMTP_PASSWORD || "",
  },
};

const fromAddress = process.env.EMAIL_FROM_ADDRESS || "";
const fromName = process.env.EMAIL_FROM_NAME || "DENEXUS";

// Create transporter
const transporter = nodemailer.createTransport(config);

// Email templates
const getVerificationCodeTemplate = (code: string, locale: string = "zh") => {
  if (locale === "zh") {
    return {
      subject: `【DENEXUS】您的验证码是 ${code}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7C3AED; margin: 0; font-size: 28px;">DENEXUS</h1>
            <p style="color: #666; margin-top: 8px;">AI驱动的TikTok电商增长平台</p>
          </div>

          <div style="background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <p style="color: rgba(255,255,255,0.9); margin: 0 0 15px 0; font-size: 16px;">您的验证码是</p>
            <div style="background: white; border-radius: 12px; padding: 20px; display: inline-block;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #7C3AED;">${code}</span>
            </div>
            <p style="color: rgba(255,255,255,0.8); margin: 15px 0 0 0; font-size: 14px;">验证码有效期为 5 分钟</p>
          </div>

          <div style="color: #666; font-size: 14px; line-height: 1.6;">
            <p>如果您没有请求此验证码，请忽略此邮件。</p>
            <p>请勿将验证码透露给任何人，以确保您的账户安全。</p>
          </div>

          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>© 2025 DENEXUS. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `【DENEXUS】您的验证码是 ${code}，有效期5分钟。如非本人操作，请忽略此邮件。`,
    };
  } else {
    return {
      subject: `[DENEXUS] Your verification code is ${code}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7C3AED; margin: 0; font-size: 28px;">DENEXUS</h1>
            <p style="color: #666; margin-top: 8px;">AI-Powered TikTok E-commerce Growth Platform</p>
          </div>

          <div style="background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <p style="color: rgba(255,255,255,0.9); margin: 0 0 15px 0; font-size: 16px;">Your verification code is</p>
            <div style="background: white; border-radius: 12px; padding: 20px; display: inline-block;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #7C3AED;">${code}</span>
            </div>
            <p style="color: rgba(255,255,255,0.8); margin: 15px 0 0 0; font-size: 14px;">This code expires in 5 minutes</p>
          </div>

          <div style="color: #666; font-size: 14px; line-height: 1.6;">
            <p>If you didn't request this code, please ignore this email.</p>
            <p>Never share your verification code with anyone to keep your account secure.</p>
          </div>

          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
            <p>This is an automated message, please do not reply.</p>
            <p>© 2025 DENEXUS. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `[DENEXUS] Your verification code is ${code}. This code expires in 5 minutes. If you didn't request this, please ignore this email.`,
    };
  }
};

// Send verification code email
export async function sendVerificationEmail(
  email: string,
  code: string,
  locale: string = "zh"
): Promise<boolean> {
  try {
    const template = getVerificationCodeTemplate(code, locale);

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

// Verify SMTP connection
export async function verifySmtpConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log("SMTP connection verified");
    return true;
  } catch (error) {
    console.error("SMTP connection failed:", error);
    return false;
  }
}
