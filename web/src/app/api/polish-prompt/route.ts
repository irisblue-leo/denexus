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

const SYSTEM_PROMPT = `你是TikTok电商视频提示词优化专家。根据用户提供的产品图片和简单描述，生成详细的视频生成提示词。

优化要点：
1. 主体细节：根据图片描述产品的外观、颜色、材质、纹理等细节
2. 场景光影：设计适合产品的背景环境、光线类型、色调氛围
3. 镜头动作：运镜方式、展示动作
4. 画面质量：分辨率、专业级别

语言规则（重要）：
- 如果用户输入是中文，则完全用中文输出（镜头术语也用中文，如"特写镜头"、"缓慢推近"、"跟拍"）
- 如果用户输入是英文，则完全用英文输出（如"close-up shot", "slow zoom in", "tracking shot"）
- 不要混用中英文

其他规则：
- 仔细观察图片中的产品，准确描述其特征
- 输出自然流畅的描述，不要使用[标签]格式
- 直接输出优化后的提示词，不要任何解释
- 控制在200字/words以内`;

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
        const visionPrompt = `${SYSTEM_PROMPT}

用户需求：${prompt}

请根据图片中的产品和用户需求，生成视频提示词。`;

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
            { role: "system", content: SYSTEM_PROMPT },
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
