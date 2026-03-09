import { NextRequest, NextResponse } from "next/server";
import type { NarratorRequest, NarratorResponse } from "@/types/game";
import { NARRATOR_PROMPT } from "@/lib/prompts";
import { buildNarratorContext } from "@/lib/context-builder";
import { callLLM } from "@/lib/llm";
import { TEMPERATURES } from "@/lib/providers";
import { debugWarn } from "@/lib/debug";
import { applyRateLimit, extractByokKey, extractProvider, safeErrorMessage, logRouteInfo, isAuthError } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req);
  if (limited) return limited;
  const byokKey = extractByokKey(req);
  const provider = extractProvider(req, byokKey);
  const apiKey = byokKey || process.env[provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"] || "";
  logRouteInfo("/api/narrator", provider, apiKey, req);
  try {
    const body: NarratorRequest = await req.json();
    const { transition, cycle, players, context } = body;

    const userMessage = buildNarratorContext(transition, cycle, players, context);

    const { text: raw } = await callLLM(apiKey, provider, {
      systemPrompt: NARRATOR_PROMPT,
      userMessage,
      maxTokens: 150,
      temperature: TEMPERATURES.narrator,
    });

    // Cleanup: markdown, quotes, em dashes, English words
    let text = raw
      .trim()
      .replace(/\*\*/g, "")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^["']|["']$/g, "")
      .replace(/\s*[—–]\s*/g, ", ")
      .replace(/,\s*,/g, ",")
      .trim();

    // A7: Filter English words from narrator
    const ENGLISH_WORDS = ["noose", "whose", "however", "although", "which", "before", "after", "during", "while", "from", "through", "darkness", "shadow", "fallen", "night", "upon", "the"];
    for (const word of ENGLISH_WORDS) {
      const wordBoundary = new RegExp(`\\b${word}\\b`, "i");
      if (wordBoundary.test(text)) {
        debugWarn(`[NARRATOR] English word detected: "${word}" in: ${text}`);
        const sentenceRegex = new RegExp(`[^.!?]*\\b${word}\\b[^.!?]*[.!?]?`, "gi");
        text = text.replace(sentenceRegex, "").trim();
      }
    }

    text = text.replace(/\s{2,}/g, " ").trim();

    return NextResponse.json<NarratorResponse>({ text });
  } catch (err: unknown) {
    console.error("[/api/narrator] ERROR:", safeErrorMessage(err), "| status:", (err as { status?: number })?.status);
    if (byokKey && isAuthError(err)) {
      return NextResponse.json({ text: "", byokError: "Clé API invalide." }, { status: 401 });
    }
    return NextResponse.json<NarratorResponse>({ text: "" }, { status: 500 });
  }
}
