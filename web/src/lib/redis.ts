import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

let isConnected = false;

export const redis =
  globalForRedis.redis ??
  new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0"),
    retryStrategy: (times) => {
      if (times > 3) {
        console.error("Redis connection failed after 3 retries");
        return null;
      }
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
  });

redis.on("connect", () => {
  isConnected = true;
  console.log("Redis connected");
});

redis.on("error", () => {
  isConnected = false;
});

redis.on("close", () => {
  isConnected = false;
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// Helper to check if Redis is available
async function ensureConnection(): Promise<boolean> {
  // Log Redis config (without password)
  if (!isConnected) {
    console.log(`[Redis] Attempting connection to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}, db: ${process.env.REDIS_DB}`);
  }

  if (isConnected && redis.status === "ready") {
    return true;
  }
  try {
    if (redis.status === "wait" || redis.status === "close" || redis.status === "end") {
      await redis.connect();
    }
    isConnected = redis.status === "ready";
    console.log(`[Redis] Connection status: ${redis.status}, isConnected: ${isConnected}`);
    return isConnected;
  } catch (error) {
    console.error(`[Redis] Connection failed:`, error);
    isConnected = false;
    return false;
  }
}

// Verification code operations
const VERIFY_CODE_PREFIX = "verify_code:";
const VERIFY_CODE_TTL = 300; // 5 minutes

// In-memory fallback for when Redis is unavailable
const memoryStore = new Map<string, { value: string; expiry: number }>();

function cleanupMemoryStore() {
  const now = Date.now();
  const entries = Array.from(memoryStore.entries());
  for (const [key, data] of entries) {
    if (data.expiry < now) {
      memoryStore.delete(key);
    }
  }
}

export async function storeVerificationCode(identifier: string, code: string): Promise<void> {
  const connected = await ensureConnection();
  console.log(`[Redis] storeVerificationCode - connected: ${connected}, identifier: ${identifier}, code: ${code}`);
  if (connected) {
    try {
      await redis.setex(`${VERIFY_CODE_PREFIX}${identifier}`, VERIFY_CODE_TTL, code);
      console.log(`[Redis] Code stored in Redis for ${identifier}`);
      return;
    } catch (error) {
      console.error("Redis storeVerificationCode error:", error);
    }
  }
  // Fallback to memory store (WARNING: doesn't work with PM2 cluster mode)
  console.warn(`[Redis] Falling back to memory store for ${identifier} - this won't work in cluster mode!`);
  cleanupMemoryStore();
  memoryStore.set(`${VERIFY_CODE_PREFIX}${identifier}`, {
    value: code,
    expiry: Date.now() + VERIFY_CODE_TTL * 1000,
  });
}

export async function getVerificationCode(identifier: string): Promise<string | null> {
  const connected = await ensureConnection();
  console.log(`[Redis] getVerificationCode - connected: ${connected}, identifier: ${identifier}`);
  if (connected) {
    try {
      const code = await redis.get(`${VERIFY_CODE_PREFIX}${identifier}`);
      console.log(`[Redis] Got code from Redis for ${identifier}: ${code}`);
      return code;
    } catch (error) {
      console.error("Redis getVerificationCode error:", error);
    }
  }
  // Fallback to memory store
  const key = `${VERIFY_CODE_PREFIX}${identifier}`;
  const data = memoryStore.get(key);
  console.log(`[Redis] Memory store lookup for ${identifier}: ${data ? data.value : 'not found'}`);
  if (data && data.expiry > Date.now()) {
    return data.value;
  }
  memoryStore.delete(key);
  return null;
}

export async function deleteVerificationCode(identifier: string): Promise<void> {
  const connected = await ensureConnection();
  if (connected) {
    try {
      await redis.del(`${VERIFY_CODE_PREFIX}${identifier}`);
      return;
    } catch (error) {
      console.error("Redis deleteVerificationCode error:", error);
    }
  }
  // Fallback to memory store
  memoryStore.delete(`${VERIFY_CODE_PREFIX}${identifier}`);
}

export async function verifyCode(identifier: string, code: string): Promise<boolean> {
  console.log(`[Redis] verifyCode - identifier: ${identifier}, input code: ${code}`);
  const storedCode = await getVerificationCode(identifier);
  console.log(`[Redis] verifyCode - stored code: ${storedCode}, match: ${storedCode === code}`);
  if (!storedCode || storedCode !== code) {
    return false;
  }
  await deleteVerificationCode(identifier);
  return true;
}

// Session operations (optional, for additional session management)
const SESSION_PREFIX = "session:";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export async function storeSession(sessionId: string, userId: string): Promise<void> {
  const connected = await ensureConnection();
  if (connected) {
    try {
      await redis.setex(`${SESSION_PREFIX}${sessionId}`, SESSION_TTL, userId);
      return;
    } catch (error) {
      console.error("Redis storeSession error:", error);
    }
  }
  // Fallback to memory store
  cleanupMemoryStore();
  memoryStore.set(`${SESSION_PREFIX}${sessionId}`, {
    value: userId,
    expiry: Date.now() + SESSION_TTL * 1000,
  });
}

export async function getSession(sessionId: string): Promise<string | null> {
  const connected = await ensureConnection();
  if (connected) {
    try {
      return await redis.get(`${SESSION_PREFIX}${sessionId}`);
    } catch (error) {
      console.error("Redis getSession error:", error);
    }
  }
  // Fallback to memory store
  const key = `${SESSION_PREFIX}${sessionId}`;
  const data = memoryStore.get(key);
  if (data && data.expiry > Date.now()) {
    return data.value;
  }
  memoryStore.delete(key);
  return null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const connected = await ensureConnection();
  if (connected) {
    try {
      await redis.del(`${SESSION_PREFIX}${sessionId}`);
      return;
    } catch (error) {
      console.error("Redis deleteSession error:", error);
    }
  }
  // Fallback to memory store
  memoryStore.delete(`${SESSION_PREFIX}${sessionId}`);
}

// Rate limiting
const RATE_LIMIT_PREFIX = "rate_limit:";
const rateLimitMemory = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const connected = await ensureConnection();

  if (connected) {
    try {
      const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
      const current = await redis.incr(redisKey);

      if (current === 1) {
        await redis.expire(redisKey, windowSeconds);
      }

      const remaining = Math.max(0, maxRequests - current);
      return {
        allowed: current <= maxRequests,
        remaining,
      };
    } catch (error) {
      console.error("Redis checkRateLimit error:", error);
    }
  }

  // Fallback to memory-based rate limiting
  const now = Date.now();
  const memKey = `${RATE_LIMIT_PREFIX}${key}`;
  const data = rateLimitMemory.get(memKey);

  if (!data || data.resetAt < now) {
    rateLimitMemory.set(memKey, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  data.count++;
  const remaining = Math.max(0, maxRequests - data.count);
  return {
    allowed: data.count <= maxRequests,
    remaining,
  };
}
