import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  createUser as dbCreateUser,
  findUserById,
  findUserByPhone,
  findUserByEmail,
  findUserByEmailOrPhone,
  DbUser,
} from "./db";
import {
  storeVerificationCode,
  verifyCode as redisVerifyCode,
} from "./redis";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "denexus-secret-key-change-in-production"
);

const TOKEN_NAME = "auth-token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface User {
  id: string;
  phone?: string | null;
  email?: string | null;
  credits: number;
  createdAt?: Date;
}

export interface JWTPayload {
  userId: string;
  phone?: string | null;
  email?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_NAME)?.value || null;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const dbUser = await findUserById(payload.userId);
  if (!dbUser) return null;

  return dbUserToUser(dbUser);
}

// Convert DB user to User interface
function dbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    phone: dbUser.phone,
    email: dbUser.email,
    credits: dbUser.credits,
    createdAt: dbUser.created_at,
  };
}

// User management functions
export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const dbUser = await findUserByPhone(phone);
  return dbUser ? dbUserToUser(dbUser) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const dbUser = await findUserByEmail(email);
  return dbUser ? dbUserToUser(dbUser) : null;
}

export async function getUserByEmailOrPhone(identifier: string): Promise<User | null> {
  const dbUser = await findUserByEmailOrPhone(identifier);
  return dbUser ? dbUserToUser(dbUser) : null;
}

export async function getDbUserByEmailOrPhone(identifier: string): Promise<DbUser | null> {
  return findUserByEmailOrPhone(identifier);
}

export async function getDbUserByPhone(phone: string): Promise<DbUser | null> {
  return findUserByPhone(phone);
}

export async function createUser(data: {
  phone?: string;
  email?: string;
  password?: string;
}): Promise<User> {
  const id = generateUserId();
  const dbUser = await dbCreateUser({
    id,
    phone: data.phone,
    email: data.email,
    password: data.password,
  });
  return dbUserToUser(dbUser);
}

export async function getUserById(id: string): Promise<User | null> {
  const dbUser = await findUserById(id);
  return dbUser ? dbUserToUser(dbUser) : null;
}

// Verification code functions
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeCode(identifier: string, code: string): Promise<void> {
  await storeVerificationCode(identifier, code);
}

export async function verifyCode(identifier: string, code: string): Promise<boolean> {
  return redisVerifyCode(identifier, code);
}
