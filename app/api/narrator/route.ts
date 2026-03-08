import { NextRequest, NextResponse } from "next/server";
import type { NarratorRequest, NarratorResponse } from "@/types/game";
import { NARRATOR_PROMPT } from "@/lib/prompts";
import { buildNarratorContext } from "@/lib/context-builder";
import { callClaude, MODELS, TEMPERATURES } from "@/lib/anthropic";
import { debugWarn } from "@/lib/debug";
import { applyRateLimit, extractByokKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req);
  if (limited) return limited;
  const byokKey = extractByokKey(req);
  try {
    const body: NarratorRequest = await req.json();
    const { transition, cycle, players, context } = body;

    const userMessage = buildNarratorContext(transition, cycle, players, context);

    const raw = await callClaude({
      systemPrompt: NARRATOR_PROMPT,
      userMessage,
      model: MODELS.narrator,
      maxTokens: 150,
      temperature: TEMPERATURES.narrator,
      byokKey,
    });

    // Cleanup: markdown, quotes, em dashes, English words
    let text = raw
      .trim()
      .replace(/\*\*/g, "")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^["']|["']$/g, "")
      .replace(/\s*[—–]\s*/g, ", ")  // C1: em dashes → commas
      .replace(/,\s*,/g, ",")
      .trim();

    // A7: Filter English words from narrator — uses \b word boundaries to avoid false positives
    const ENGLISH_WORDS = ["noose", "whose", "however", "although", "which", "before", "after", "during", "while", "from", "through", "darkness", "shadow", "fallen", "night", "upon", "the"];
    for (const word of ENGLISH_WORDS) {
      const wordBoundary = new RegExp(`\\b${word}\\b`, "i");
      if (wordBoundary.test(text)) {
        debugWarn(`[NARRATOR] English word detected: "${word}" in: ${text}`);
        const sentenceRegex = new RegExp(`[^.!?]*\\b${word}\\b[^.!?]*[.!?]?`, "gi");
        text = text.replace(sentenceRegex, "").trim();
      }
    }

    // Clean up double spaces
    text = text.replace(/\s{2,}/g, " ").trim();

    return NextResponse.json<NarratorResponse>({ text });
  } catch (err: unknown) {
    if (byokKey && err instanceof Error && (err.message?.includes("401") || err.message?.includes("auth") || err.message?.includes("API key"))) {
      return NextResponse.json({ text: "", byokError: "Clé API invalide. Vérifie-la sur console.anthropic.com" }, { status: 401 });
    }
    console.error("[/api/narrator]", err);
    return NextResponse.json<NarratorResponse>({ text: "" }, { status: 500 });
  }
}
