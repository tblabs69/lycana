import { NextRequest, NextResponse } from "next/server";
import type { Provider } from "@/lib/providers";
import { detectProvider } from "@/lib/providers";
import { debugLog } from "@/lib/debug";

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

/** Extract BYOK key from request header — never log it. Accepts both Anthropic (sk-ant-) and OpenAI (sk-) keys */
export function extractByokKey(req: NextRequest): string | undefined {
  const key = req.headers.get("x-api-key")?.trim();
  if (!key) return undefined;
  let result: string | undefined;
  // Anthropic: sk-ant-... (strict charset)
  if (/^sk-ant-[a-zA-Z0-9_-]{20,}$/.test(key)) result = key;
  // OpenAI: sk- (not sk-ant-), at least 20 chars, no charset restriction (format changes often)
  else if (key.startsWith("sk-") && !key.startsWith("sk-ant-") && key.length >= 20) result = key;
  debugLog(`[BYOK] prefix: ${key?.substring(0, 10)} | length: ${key?.length} | passed: ${!!result}`);
  return result;
}

/** Extract provider from request — header > key detection > default */
export function extractProvider(req: NextRequest, byokKey?: string): Provider {
  const header = req.headers.get("x-provider");
  if (header === "openai" || header === "anthropic") return header;
  if (byokKey) {
    const detected = detectProvider(byokKey);
    if (detected) return detected;
  }
  return (process.env.DEFAULT_PROVIDER as Provider) || "anthropic";
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
    const msg = (err.message || "Unknown error").replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED]");
    const status = (err as { status?: number }).status;
    return status ? `${status}: ${msg}` : msg;
  }
  return "Unknown error";
}

/** Log route info — always logs (console.log) for debugging provider routing */
export function logRouteInfo(route: string, provider: Provider, apiKey: string, req: NextRequest) {
  console.log(`[${route}] Provider: ${provider} | Key prefix: ${apiKey?.substring(0, 10) || "NONE"} | Key length: ${apiKey?.length || 0} | x-provider header: ${req.headers.get("x-provider") || "MISSING"} | x-api-key present: ${!!req.headers.get("x-api-key")} | byokKey extracted: ${!!apiKey && apiKey.startsWith("sk-")}`);
}

/** Check if an error is a true 401 auth error from the LLM provider */
export function isAuthError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Both Anthropic and OpenAI SDKs set .status on API errors
  const status = (err as { status?: number }).status;
  if (status === 401) return true;
  // Fallback: only match exact "401" status string, not vague words like "auth"
  if (err.message?.includes("401")) return true;
  return false;
}

/** Guard: reject early if no API key is available (BYOK missing + no env key) */
export function requireApiKey(apiKey: string, byokKey: string | undefined): NextResponse | null {
  if (apiKey && apiKey.length > 0) return null; // key exists, proceed
  // No key at all — return 401 before calling LLM
  if (byokKey === undefined) {
    // BYOK header was absent or rejected by extractByokKey
    return NextResponse.json(
      { error: "Clé API requise.", byokError: "Clé API requise." },
      { status: 401 }
    );
  }
  // byokKey was set but somehow apiKey is still empty (shouldn't happen)
  return NextResponse.json(
    { error: "Clé API invalide.", byokError: "Clé API invalide." },
    { status: 401 }
  );
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
