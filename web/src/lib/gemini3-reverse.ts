// 302.AI Gemini API Integration for Reverse Prompt (Native Gemini Format)

const API_KEY = process.env.JUHE_API_KEY || "";
const BASE_URL = process.env.JUHE_BASE_URL || "https://api.302.ai";
const ENABLED = process.env.JUHE_ENABLED === "true";

// Use gemini-2.5-flash for video analysis (supports video in native format)
const DEFAULT_MODEL = "gemini-2.5-flash";

// Max video size for inline_data (20MB)
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

// Convert media URL to base64
async function mediaUrlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check size limit for videos
    if (buffer.length > MAX_VIDEO_SIZE) {
      console.warn(`Media size ${buffer.length} exceeds limit ${MAX_VIDEO_SIZE}`);
      return null;
    }

    const base64 = buffer.toString("base64");
    const contentType = response.headers.get("content-type") || "video/mp4";

    return {
      data: base64,
      mimeType: contentType,
    };
  } catch (error) {
    console.error("Failed to convert media to base64:", error);
    return null;
  }
}

interface ReversePromptRequest {
  sourceUrl: string;
  mode: "video" | "image";
  model?: string;
}

interface ReversePromptResponse {
  success: boolean;
  prompt?: string;
  error?: string;
  rawResponse?: string;
}

// System prompt for reverse engineering prompts
const IMAGE_REVERSE_PROMPT = `你是一位专业的图片分析专家，擅长分析图片并反推出可用于AI图像生成的提示词。

请仔细分析这张图片，并生成一个详细的提示词，可用于AI图像生成工具重新创建类似的图片。

你的回复应包括：
1. 主体描述（图片中有什么）
2. 风格和艺术元素（摄影风格、艺术风格、光线、色彩）
3. 构图和取景
4. 情绪和氛围
5. 技术细节（如适用）

请将提示词以单段落形式输出，针对AI图像生成进行优化。要具体且详细。
同时输出中文版本和英文版本，格式如下：

【中文提示词】
（中文提示词内容）

【English Prompt】
（英文提示词内容）`;

const VIDEO_REVERSE_PROMPT = `你是一位专业的视频分析专家，擅长分析视频并反推出可用于AI视频生成的提示词。

请仔细分析这个视频，并生成一个详细的提示词，可用于AI视频生成工具重新创建类似的视频。

你的回复应包括：
1. 主体和动作描述
2. 场景设置和环境
3. 镜头运动和角度
4. 视觉风格（电影感、纪录片、动画等）
5. 灯光和色彩调色
6. 情绪和氛围
7. 节奏和转场

请将提示词以单段落形式输出，针对AI视频生成进行优化。要具体且详细。
同时输出中文版本和英文版本，格式如下：

【中文提示词】
（中文提示词内容）

【English Prompt】
（英文提示词内容）`;

// Analyze image and reverse engineer the prompt
export async function reverseImagePrompt(
  request: ReversePromptRequest
): Promise<ReversePromptResponse> {
  if (!ENABLED) {
    return {
      success: false,
      error: "302.AI API is not enabled",
    };
  }

  if (!API_KEY) {
    return {
      success: false,
      error: "302.AI API key is not configured",
    };
  }

  try {
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    // Add system prompt
    content.push({
      type: "text",
      text: IMAGE_REVERSE_PROMPT,
    });

    // Add image
    content.push({
      type: "image_url",
      image_url: {
        url: request.sourceUrl,
      },
    });

    const requestBody = {
      model: request.model || DEFAULT_MODEL,
      stream: false,
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
    };

    console.log("Calling Gemini API for image reverse:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("Gemini API response:", responseText);

    if (!response.ok) {
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }
      return {
        success: false,
        error: errorMessage,
        rawResponse: responseText,
      };
    }

    const data = JSON.parse(responseText);
    let prompt = "";

    if (data.choices && data.choices.length > 0) {
      const messageContent = data.choices[0].message?.content;
      if (typeof messageContent === "string") {
        prompt = messageContent.trim();
      } else if (Array.isArray(messageContent)) {
        // Handle array content format
        for (const item of messageContent) {
          if (item.type === "text" && item.text) {
            prompt += item.text;
          }
        }
        prompt = prompt.trim();
      }
    }

    return {
      success: prompt.length > 0,
      prompt: prompt || undefined,
      error: prompt.length === 0 ? "No prompt generated" : undefined,
      rawResponse: responseText,
    };
  } catch (error) {
    console.error("Gemini reverse image error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Analyze video and reverse engineer the prompt (using native Gemini API format)
export async function reverseVideoPrompt(
  request: ReversePromptRequest
): Promise<ReversePromptResponse> {
  if (!ENABLED) {
    return {
      success: false,
      error: "302.AI API is not enabled",
    };
  }

  if (!API_KEY) {
    return {
      success: false,
      error: "302.AI API key is not configured",
    };
  }

  try {
    // Download video and convert to base64 for inline_data
    console.log("Downloading video for base64 conversion:", request.sourceUrl);
    const mediaData = await mediaUrlToBase64(request.sourceUrl);

    if (!mediaData) {
      return {
        success: false,
        error: "Failed to download video or video exceeds 20MB limit",
      };
    }

    console.log(`Video converted to base64, size: ${(mediaData.data.length / 1024 / 1024).toFixed(2)} MB, mimeType: ${mediaData.mimeType}`);

    const model = request.model || DEFAULT_MODEL;

    // Build request body using native Gemini API format
    // Reference: https://ai.google.dev/gemini-api/docs/video-understanding
    const requestBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mediaData.mimeType,
                data: mediaData.data,
              },
            },
            {
              text: VIDEO_REVERSE_PROMPT,
            },
          ],
        },
      ],
    };

    console.log(`Calling native Gemini API for video reverse, model: ${model}`);

    // Use native Gemini API endpoint: /v1beta/models/{model}:generateContent
    const response = await fetch(`${BASE_URL}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("Gemini API video response:", responseText);

    if (!response.ok) {
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }
      return {
        success: false,
        error: errorMessage,
        rawResponse: responseText,
      };
    }

    const data = JSON.parse(responseText);
    let prompt = "";

    // Parse native Gemini response format
    // Response: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
    if (data.candidates && data.candidates.length > 0) {
      const parts = data.candidates[0].content?.parts;
      if (parts && Array.isArray(parts)) {
        for (const part of parts) {
          if (part.text) {
            prompt += part.text;
          }
        }
        prompt = prompt.trim();
      }
    }

    return {
      success: prompt.length > 0,
      prompt: prompt || undefined,
      error: prompt.length === 0 ? "No prompt generated" : undefined,
      rawResponse: responseText,
    };
  } catch (error) {
    console.error("Gemini reverse video error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Main function to reverse prompt based on mode
export async function reversePrompt(
  request: ReversePromptRequest
): Promise<ReversePromptResponse> {
  if (request.mode === "video") {
    return reverseVideoPrompt(request);
  } else {
    return reverseImagePrompt(request);
  }
}
