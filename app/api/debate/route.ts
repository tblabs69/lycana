import { NextRequest, NextResponse } from "next/server";
import type { DebateRequest, DebateResponse } from "@/types/game";
import { buildSystemPrompt } from "@/lib/prompts";
import { buildGameContext } from "@/lib/context-builder";
import { callLLM } from "@/lib/llm";
import { TEMPERATURES } from "@/lib/providers";
import { cleanResponse } from "@/lib/anthropic";
import { isWolfRole } from "@/lib/game-engine";
import { applyRateLimit, extractByokKey, extractProvider, validatePlayerName, safeErrorMessage } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req);
  if (limited) return limited;
  const byokKey = extractByokKey(req);
  const provider = extractProvider(req, byokKey);
  const apiKey = byokKey || process.env[provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"] || "";
  try {
    const body: DebateRequest = await req.json();
    const { player, players, messages, cycle, round, nightResult, history, seerLog, lovers, directive, notableAccusations } = body;

    if (!validatePlayerName(player?.name)) {
      return NextResponse.json({ text: "..." }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(player, players);
    const userMessage = buildGameContext(
      player, players, messages, cycle, round,
      nightResult, history, seerLog, lovers, directive, notableAccusations
    );

    const isWolf = isWolfRole(player.role);
    const temperature = isWolf ? TEMPERATURES.wolf : TEMPERATURES.villager;

    const { text: raw } = await callLLM(apiKey, provider, {
      systemPrompt, userMessage, maxTokens: 200, temperature,
      prefill: `${player.name} : "`,
    });

    const text = cleanResponse(raw, player.name);
    return NextResponse.json<DebateResponse>({ text });
  } catch (err: unknown) {
    if (byokKey && err instanceof Error && (err.message?.includes("401") || err.message?.includes("auth") || err.message?.includes("API key"))) {
      return NextResponse.json({ text: "...", byokError: "Clé API invalide." }, { status: 401 });
    }
    console.error("[/api/debate]", safeErrorMessage(err));
    return NextResponse.json({ text: "..." }, { status: 500 });
  }
}
