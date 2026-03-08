import { NextRequest, NextResponse } from "next/server";
import type { DebateRequest, DebateResponse } from "@/types/game";
import { buildSystemPrompt } from "@/lib/prompts";
import { buildGameContext } from "@/lib/context-builder";
import { callClaude, cleanResponse, MODELS, TEMPERATURES } from "@/lib/anthropic";
import { isWolfRole } from "@/lib/game-engine";
import { applyRateLimit, extractByokKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req);
  if (limited) return limited;
  const byokKey = extractByokKey(req);
  try {
    const body: DebateRequest = await req.json();
    const { player, players, messages, cycle, round, nightResult, history, seerLog, lovers, directive, notableAccusations } = body;

    const systemPrompt = buildSystemPrompt(player, players);
    const userMessage = buildGameContext(
      player, players, messages, cycle, round,
      nightResult, history, seerLog, lovers, directive, notableAccusations
    );

    const isWolf = isWolfRole(player.role);
    const model = isWolf ? MODELS.wolves : MODELS.villager;
    const temperature = isWolf ? TEMPERATURES.wolf : TEMPERATURES.villager;

    const raw = await callClaude({
      systemPrompt, userMessage, model, maxTokens: 200, temperature,
      prefill: `${player.name} : "`,
      byokKey,
    });

    const text = cleanResponse(raw, player.name);
    return NextResponse.json<DebateResponse>({ text });
  } catch (err: unknown) {
    if (byokKey && err instanceof Error && (err.message?.includes("401") || err.message?.includes("auth") || err.message?.includes("API key"))) {
      return NextResponse.json({ text: "...", byokError: "Clé API invalide. Vérifie-la sur console.anthropic.com" }, { status: 401 });
    }
    console.error("[/api/debate]", err);
    return NextResponse.json({ text: "..." }, { status: 500 });
  }
}
