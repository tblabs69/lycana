import { NextRequest, NextResponse } from "next/server";
import type { JournalEntry } from "@/types/game";
import { callLLM } from "@/lib/llm";
import { parseJournalEntry } from "@/lib/journal";
import { applyRateLimit, extractByokKey, extractProvider, safeErrorMessage, logRouteInfo, isAuthError } from "@/lib/rate-limit";

interface JournalBatchRequest {
  updates: {
    playerName: string;
    role: string;
    gender: string;
    systemPrompt: string;
    userMessage: string;
    phase: string;
  }[];
}

interface JournalBatchResponse {
  entries: { playerName: string; entry: JournalEntry }[];
}

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req);
  if (limited) return limited;
  const byokKey = extractByokKey(req);
  const provider = extractProvider(req, byokKey);
  const apiKey = byokKey || process.env[provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"] || "";
  logRouteInfo("/api/journal-update", provider, apiKey, req);
  try {
    const body: JournalBatchRequest = await req.json();
    const { updates } = body;

    const results = await Promise.all(
      updates.map(async (update) => {
        try {
          const { text: raw } = await callLLM(apiKey, provider, {
            systemPrompt: update.systemPrompt,
            userMessage: update.userMessage,
            maxTokens: 200,
            temperature: 0.5,
          });

          const entry = parseJournalEntry(raw, update.phase);
          return { playerName: update.playerName, entry };
        } catch (err) {
          console.error(`[journal-update] Failed for ${update.playerName}:`, err);
          return {
            playerName: update.playerName,
            entry: {
              phase: update.phase,
              observations: "Erreur de mise à jour.",
              analysis: "",
              suspicions: "",
              alliances: "",
              threats: "",
              strategy: "Observer.",
            } as JournalEntry,
          };
        }
      })
    );

    return NextResponse.json<JournalBatchResponse>({ entries: results });
  } catch (err: unknown) {
    console.error("[/api/journal-update] ERROR:", safeErrorMessage(err), "| status:", (err as { status?: number })?.status);
    if (byokKey && isAuthError(err)) {
      return NextResponse.json({ entries: [], byokError: "Clé API invalide." }, { status: 401 });
    }
    return NextResponse.json<JournalBatchResponse>({ entries: [] }, { status: 500 });
  }
}
