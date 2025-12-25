import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const API_KEY = process.env.JUHE_API_KEY || "";
const BASE_URL = process.env.JUHE_BASE_URL || "https://api.302.ai";

// Convert image URL to base64
async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    const contentType = response.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Failed to convert image to base64:", error);
    return null;
  }
}

// System prompt when image is provided
const SYSTEM_PROMPT_WITH_IMAGE = `你是TikTok电商视频提示词润色专家。

【任务】
直接润色用户输入的内容，扩展成完整的AI生成提示词。图片仅用于了解产品外观。

【润色规则】
1. 保留用户输入的核心意图
2. 补充人物、场景、动作、氛围等细节
3. 加入图片中产品的外观特征（颜色、形状等）

【输出结构】
人物形象 + 场景环境 + 手持/展示图中的产品 + 动作描述 + 光线氛围 + 画质风格

【示例】
用户输入：售卖盘子
润色输出：一位亲和力强的年轻女性博主，在温馨的现代厨房中，面带微笑地双手捧着图中的陶瓷盘向镜头展示，柔和自然光，专业带货直播风格，高清画质

【注意】
- 直接输出润色后的提示词
- 不要分析图片
- 不要解释
- 控制在150字以内`;

// System prompt when no image is provided (text-only optimization)
const SYSTEM_PROMPT_TEXT_ONLY = `你是TikTok电商视频提示词润色专家。

【任务】
直接润色用户输入的内容，扩展成完整的AI生成提示词。

【润色规则】
1. 保留用户输入的核心意图
2. 补充人物、场景、动作、氛围等细节

【输出结构】
人物形象 + 场景环境 + 产品/动作描述 + 光线氛围 + 画质风格

【示例】
用户输入：售卖手机壳
润色输出：一位时尚的年轻女性，在简约现代的直播间中，手持精美的手机壳向镜头展示细节，柔和环形灯光，专业带货风格，高清画质

【注意】
- 直接输出润色后的提示词
- 不要解释
- 控制在150字以内`;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, imageUrl } = await request.json();

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: "API not configured" },
        { status: 500 }
      );
    }

    // Build messages based on whether image is provided
    type MessageContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;

    let userContent: MessageContent;
    let useVisionModel = false;

    if (imageUrl) {
      // Convert image URL to base64 for GPT-4o vision
      const base64Image = await imageUrlToBase64(imageUrl);

      if (base64Image) {
        useVisionModel = true;
        // Combine system prompt with user request for vision model
        const visionPrompt = `${SYSTEM_PROMPT_WITH_IMAGE}

请润色以下内容：${prompt}

直接输出润色后的提示词。`;

        userContent = [
          {
            type: "text",
            text: visionPrompt,
          },
          {
            type: "image_url",
            image_url: {
              url: base64Image,
            },
          },
        ];
      } else {
        // Fallback to text only if image conversion fails
        userContent = prompt;
      }
    } else {
      // No image provided - use text-only optimization
      userContent = prompt;
    }

    // Call GPT-4o via 302.AI with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for vision

    // Build request body based on whether using vision
    const requestBody = useVisionModel
      ? {
          model: "gpt-4o",
          stream: false,
          messages: [
            {
              role: "user",
              content: userContent,
            },
          ],
        }
      : {
          model: "gpt-4o-mini",
          stream: false,
          messages: [
            { role: "system", content: SYSTEM_PROMPT_TEXT_ONLY },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        };

    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();

    if (!response.ok) {
      console.error("GPT-4o API error:", responseText);
      return NextResponse.json(
        { error: "Failed to polish prompt" },
        { status: 500 }
      );
    }

    const result = JSON.parse(responseText);
    const polishedPrompt = result.choices?.[0]?.message?.content?.trim();

    if (!polishedPrompt) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      polishedPrompt,
    });
  } catch (error) {
    console.error("Polish prompt error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
