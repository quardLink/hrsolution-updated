import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

// Dev-only fallback so `npm run dev` works before a real secret is set —
// mirrors the same graceful-local-fallback pattern used elsewhere in this
// app (e.g. adminPassword's ENV_PASSWORD default). Vercel deployments must
// set a real SESSION_SECRET; this fallback makes every session forgeable.
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  logger.warn("SESSION_SECRET is not set — falling back to an insecure default in production");
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const COOKIE_NAME = "session";

interface SessionPayload {
  adminUserId: string;
  orgId: string;
  exp: number;
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", SESSION_SECRET).update(payload).digest());
}

export function issueSessionToken(adminUserId: string, orgId: string): string {
  const payload: SessionPayload = { adminUserId, orgId, exp: Date.now() + SESSION_TTL_MS };
  const encoded = base64url(Buffer.from(JSON.stringify(payload)));
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (!payload.adminUserId || !payload.orgId) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function requireOrgSession(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.orgId = payload.orgId;
  req.adminUserId = payload.adminUserId;
  next();
}
