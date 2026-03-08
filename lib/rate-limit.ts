import { NextRequest, NextResponse } from "next/server";

/** Simple in-memory rate limiter per IP — 60 req/min */

const windowMs = 60_000;
const maxRequests = 60;

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 300_000);
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: maxRequests - entry.count };
}

/** Extract BYOK key from request header — never log it */
export function extractByokKey(req: NextRequest): string | undefined {
  const key = req.headers.get("x-api-key");
  return key && /^sk-ant-[a-zA-Z0-9_-]{20,}$/.test(key) ? key : undefined;
}

/** Validate player name: unicode letters/numbers/spaces/hyphens/apostrophes, max 20 chars */
const VALID_NAME = /^[\p{L}\p{N}\s'-]{1,20}$/u;

export function validatePlayerName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  return VALID_NAME.test(trimmed) ? trimmed : null;
}

/** Sanitize error for logging — strip API keys and stack traces */
export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = (err.message || "Unknown error").replace(/sk-ant-[a-zA-Z0-9_-]+/g, "[REDACTED]");
    const status = (err as { status?: number }).status;
    return status ? `${status}: ${msg}` : msg;
  }
  return "Unknown error";
}

/** Returns a 429 response if rate limited, or null if OK */
export function applyRateLimit(req: NextRequest): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" } }
    );
  }
  return null;
}
