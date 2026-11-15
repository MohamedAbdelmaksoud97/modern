import { cookies } from "next/headers";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import type { User } from "@/lib/types";
import { pool } from "./db";
import { AppError } from "./rules";
const scrypt = promisify(scryptCallback);
export const cookieName = "modern_session";
export const userColumns =
  "u.id,u.name,u.email,u.role,u.client_id,u.active,u.must_change_password,u.created_at";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 128)
    throw new AppError("كلمة المرور من 12 إلى 128 حرفاً");
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  try {
    const [method, salt, hash] = encoded.split("$");
    if (method !== "scrypt" || password.length > 128) return false;
    const actual = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(hash, "hex");
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}
export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || token.length > 200) return null;
  const { rows } = await pool.query(
    `SELECT ${userColumns} FROM modern.sessions s JOIN modern.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active`,
    [tokenHash(token)],
  );
  return rows[0] ?? null;
}
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) throw new AppError("يرجى تسجيل الدخول", 401);
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await pool.query(
    "INSERT INTO modern.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '12 hours')",
    [tokenHash(token), userId],
  );
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 43200,
  });
}
export async function clearSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (token)
    await pool.query("DELETE FROM modern.sessions WHERE token_hash=$1", [
      tokenHash(token),
    ]);
  (await cookies()).delete(cookieName);
}
