import { NextRequest, NextResponse } from "next/server";
import type { VoteRequest, VoteResponse } from "@/types/game";
import { buildSystemPrompt } from "@/lib/prompts";
import { buildVoteContext } from "@/lib/context-builder";
import { callLLM } from "@/lib/llm";
import { TEMPERATURES } from "@/lib/providers";
import { parseName, isWolfRole } from "@/lib/game-engine";
import { debugLog } from "@/lib/debug";
import { applyRateLimit, extractByokKey, extractProvider, validatePlayerName, safeErrorMessage, logRouteInfo } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req);
  if (limited) return limited;
  const byokKey = extractByokKey(req);
  const provider = extractProvider(req, byokKey);
  const apiKey = byokKey || process.env[provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"] || "";
  logRouteInfo("/api/vote", provider, apiKey, req);
  try {
    const body: VoteRequest = await req.json();
    const { player, players, messages, cycle, contrarian, lovers } = body;

    if (!validatePlayerName(player?.name)) {
      return NextResponse.json({ target: "", reason: "" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(player, players);
    const userMessage = buildVoteContext(player, players, messages, cycle, contrarian, lovers);

    const isWolf = isWolfRole(player.role);
    const temperature = isWolf ? TEMPERATURES.wolf : TEMPERATURES.villager;

    const { text: raw } = await callLLM(apiKey, provider, {
      systemPrompt, userMessage, maxTokens: 100, temperature,
    });

    const parsed = parseName(raw, "VOTE");
    const reasonMatch = raw.match(/RAISON:\s*(.+)/i);
    const reason = reasonMatch ? reasonMatch[1].trim() : "";

    const validTargets = players.filter(
      (p) => p.alive && p.name !== player.name
    );
    const match = parsed
      ? validTargets.find(
          (p) => p.name.toLowerCase() === parsed.toLowerCase().trim()
        )
      : null;

    let target = match
      ? match.name
      : validTargets[Math.floor(Math.random() * validTargets.length)]?.name ?? "";

    // A1: Lover safety net — redirect if voting against partner
    if (lovers && target) {
      const isLover = player.name === lovers.player1 || player.name === lovers.player2;
      if (isLover) {
        const partnerName = player.name === lovers.player1 ? lovers.player2 : lovers.player1;
        if (target === partnerName) {
          const safe = validTargets.filter((p) => p.name !== partnerName);
          target = safe.length > 0 ? safe[Math.floor(Math.random() * safe.length)].name : target;
          debugLog(`[VOTE] ⚠️ ${player.name} tried to vote against lover ${partnerName} — redirected to ${target}`);
        }
      }
    }

    return NextResponse.json<VoteResponse>({ target, reason });
  } catch (err: unknown) {
    if (byokKey && err instanceof Error && (err.message?.includes("401") || err.message?.includes("auth") || err.message?.includes("API key"))) {
      return NextResponse.json({ target: "", reason: "", byokError: "Clé API invalide." }, { status: 401 });
    }
    console.error("[/api/vote]", safeErrorMessage(err));
    return NextResponse.json({ target: "", reason: "" }, { status: 500 });
  }
}
