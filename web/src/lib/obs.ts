import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// Huawei OBS is S3-compatible
const obsClient = new S3Client({
  region: process.env.OBS_REGION || "cn-east-3",
  endpoint: `https://${process.env.OBS_ENDPOINT}`,
  credentials: {
    accessKeyId: process.env.OBS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.OBS_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: false,
});

const BUCKET_NAME = process.env.OBS_BUCKET_NAME || "denexus";
const UPLOAD_FOLDER = process.env.OBS_UPLOAD_FOLDER || "uploads/";
const PUBLIC_URL = process.env.OBS_PUBLIC_URL || "";

// Generate a unique file path based on user ID and timestamp
export function generateFilePath(
  userId: string,
  filename: string,
  type: "uploads" | "generated" = "uploads"
): string {
  const timestamp = Date.now();
  const date = new Date();
  const dateFolder = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  const ext = filename.split(".").pop() || "png";
  const uniqueName = `${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  return `${type}/${userId}/${dateFolder}/${uniqueName}`;
}

// Upload a file to OBS
export async function uploadToOBS(
  filePath: string,
  data: Buffer | Uint8Array | string,
  contentType: string = "application/octet-stream"
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filePath,
    Body: data,
    ContentType: contentType,
    ACL: "public-read",
  });

  await obsClient.send(command);

  return `${PUBLIC_URL}/${filePath}`;
}

// Upload a file from base64 string
export async function uploadBase64ToOBS(
  userId: string,
  base64Data: string,
  filename: string,
  contentType: string = "image/png",
  type: "uploads" | "generated" = "generated"
): Promise<string> {
  // Remove data URL prefix if present
  const base64Content = base64Data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(base64Content, "base64");

  const filePath = generateFilePath(userId, filename, type);
  return uploadToOBS(filePath, buffer, contentType);
}

// Upload a file from URL (download and re-upload to OBS)
export async function uploadFromURLToOBS(
  userId: string,
  imageUrl: string,
  filename: string,
  type: "uploads" | "generated" = "generated"
): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filePath = generateFilePath(userId, filename, type);
  return uploadToOBS(filePath, buffer, contentType);
}

// Get file from OBS
export async function getFromOBS(filePath: string): Promise<Buffer | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath,
    });

    const response = await obsClient.send(command);
    if (response.Body) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
    return null;
  } catch (error) {
    console.error("Error getting file from OBS:", error);
    return null;
  }
}

// Delete file from OBS
export async function deleteFromOBS(filePath: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filePath,
    });

    await obsClient.send(command);
    return true;
  } catch (error) {
    console.error("Error deleting file from OBS:", error);
    return false;
  }
}

// Get public URL for a file
export function getPublicURL(filePath: string): string {
  return `${PUBLIC_URL}/${filePath}`;
}

// Extract file path from public URL
export function extractFilePathFromURL(url: string): string | null {
  if (url.startsWith(PUBLIC_URL)) {
    return url.replace(`${PUBLIC_URL}/`, "");
  }
  return null;
}
