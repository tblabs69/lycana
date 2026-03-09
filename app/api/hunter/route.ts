import { NextRequest, NextResponse } from "next/server";
import type { HunterRequest, HunterResponse } from "@/types/game";
import { buildSystemPrompt } from "@/lib/prompts";
import { buildHunterContext } from "@/lib/context-builder";
import { callLLM } from "@/lib/llm";
import { TEMPERATURES } from "@/lib/providers";
import { findPlayer, parseName } from "@/lib/game-engine";
import { applyRateLimit, extractByokKey, extractProvider, validatePlayerName, safeErrorMessage, logRouteInfo } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req);
  if (limited) return limited;
  const byokKey = extractByokKey(req);
  const provider = extractProvider(req, byokKey);
  const apiKey = byokKey || process.env[provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"] || "";
  logRouteInfo("/api/hunter", provider, apiKey, req);
  try {
    const body: HunterRequest = await req.json();
    const { hunter, players, messages, history, cycle } = body;

    if (!validatePlayerName(hunter?.name)) {
      return NextResponse.json({ target: "" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(hunter, players);
    const userMessage = buildHunterContext(hunter, players, messages, history, cycle);

    const { text: raw } = await callLLM(apiKey, provider, {
      systemPrompt, userMessage, maxTokens: 80, temperature: TEMPERATURES.villager,
    });

    const parsed = parseName(raw, "TIR");
    const target = parsed ? findPlayer(players, parsed) : null;

    const validTargets = players.filter(
      (p) => p.alive && p.name !== hunter.name
    );
    const finalTarget =
      target && target.alive && target.name !== hunter.name
        ? target.name
        : validTargets.length > 0
        ? validTargets[Math.floor(Math.random() * validTargets.length)].name
        : null;

    if (!finalTarget) {
      return NextResponse.json({ target: "" });
    }

    return NextResponse.json<HunterResponse>({ target: finalTarget });
  } catch (err: unknown) {
    if (byokKey && err instanceof Error && (err.message?.includes("401") || err.message?.includes("auth") || err.message?.includes("API key"))) {
      return NextResponse.json({ target: "", byokError: "Clé API invalide." }, { status: 401 });
    }
    console.error("[/api/hunter]", safeErrorMessage(err));
    return NextResponse.json({ target: "" }, { status: 500 });
  }
}
