import { NextRequest, NextResponse } from "next/server";
import type { Player, Lovers } from "@/types/game";
import { buildSystemPrompt } from "@/lib/prompts";
import { callClaude, cleanResponse, MODELS, TEMPERATURES } from "@/lib/anthropic";
import { isWolfRole } from "@/lib/game-engine";
import { debugLog } from "@/lib/debug";
import { applyRateLimit, extractByokKey } from "@/lib/rate-limit";

interface WolfChatRequest {
  wolf: Player;
  players: Player[];
  cycle: number;
  humanMessage: string;
  chatHistory: { speaker: string; text: string }[];
  lovers?: Lovers | null;
}

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req);
  if (limited) return limited;
  const byokKey = extractByokKey(req);
  try {
    const body: WolfChatRequest = await req.json();
    const { wolf, players, cycle, humanMessage, chatHistory, lovers } = body;

    // Filter targets: exclude wolves AND lover's partner if a wolf is in love
    let targets = players
      .filter((p) => p.alive && !isWolfRole(p.role))
      .map((p) => p.name);

    // B1: Wolf lover protection — remove partner from targets
    let loverWarning = "";
    if (lovers) {
      const allWolves = players.filter((p) => isWolfRole(p.role) && p.alive);
      for (const w of allWolves) {
        if (w.name === lovers.player1 || w.name === lovers.player2) {
          const partnerName = w.name === lovers.player1 ? lovers.player2 : lovers.player1;
          targets = targets.filter((t) => t !== partnerName);
          loverWarning = `\n⚠️ INTERDIT : ${partnerName} est l'amoureux d'un loup. Si ${partnerName} meurt, le loup amoureux meurt aussi. Ne propose JAMAIS ${partnerName} comme cible.\n`;
        }
      }
    }

    const partners = players.filter(
      (p) => isWolfRole(p.role) && p.name !== wolf.name && p.alive
    );
    const humanWolf = partners.find((p) => p.isHuman);
    const humanName = humanWolf?.name || "toi";

    const systemPrompt = buildSystemPrompt(wolf, players);

    // Build conversation context
    let historyStr = "";
    if (chatHistory.length > 0) {
      historyStr = "\nConversation précédente :\n" +
        chatHistory.map((m) => `${m.speaker}: "${m.text}"`).join("\n") + "\n";
    }

    let userMessage: string;

    if (cycle === 1) {
      // PREMIÈRE NUIT: aucun débat n'a eu lieu, forcer le hasard
      userMessage = `C'est la PREMIÈRE NUIT. Tu es Loup-Garou. Tu chuchotes avec ${humanName} (ton allié loup).
${loverWarning}${historyStr}
${humanName} dit : "${humanMessage}"

Cibles possibles : ${targets.join(", ")}

⚠️ RÈGLE ABSOLUE NUIT 1 :
Il n'y a eu AUCUN débat, AUCUN vote, AUCUNE interaction entre joueurs.
Tu ne sais RIEN sur les autres joueurs. Tu ne les as JAMAIS vus parler.
Tu ne peux PAS dire "elle n'a rien fait", "il ne s'est pas imposé", "elle était suspecte" — RIEN de tout ça n'est arrivé.
Propose une cible AU HASARD et dis-le franchement : "Aucune info, je propose X au hasard" ou "Je connais personne, on tente X ?"

Réponds en 1-2 phrases. Sois bref et complice.`;
    } else {
      userMessage = `C'est la nuit ${cycle}. Tu es Loup-Garou. Tu chuchotes avec ${humanName} (ton allié loup) pour décider qui dévorer.
${loverWarning}${historyStr}
${humanName} dit : "${humanMessage}"

Cibles possibles : ${targets.join(", ")}

Réponds en 1-3 phrases comme dans une discussion de complot. Tu peux :
- Proposer une cible et expliquer pourquoi
- Réagir à la suggestion de ${humanName}
- Partager un soupçon ou une stratégie

Sois naturel, bref, complice. Parle comme un conspirateur, pas comme un analyste.`;
    }

    const raw = await callClaude({
      systemPrompt,
      userMessage,
      model: MODELS.wolves,
      maxTokens: 150,
      temperature: TEMPERATURES.wolf,
      byokKey,
    });

    const text = cleanResponse(raw, wolf.name);
    debugLog(`[WOLF CHAT] ${wolf.name} répond : "${text}"`);

    return NextResponse.json({ text });
  } catch (err: unknown) {
    if (byokKey && err instanceof Error && (err.message?.includes("401") || err.message?.includes("auth") || err.message?.includes("API key"))) {
      return NextResponse.json({ text: "...", byokError: "Clé API invalide. Vérifie-la sur console.anthropic.com" }, { status: 401 });
    }
    console.error("[/api/wolf-chat]", err);
    return NextResponse.json({ text: "..." }, { status: 500 });
  }
}
