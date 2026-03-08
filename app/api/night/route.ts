import { NextRequest, NextResponse } from "next/server";
import type { NightRequest, NightResponse } from "@/types/game";
import { buildSystemPrompt } from "@/lib/prompts";
import {
  buildWolfNightContext,
  buildSeerNightContext,
  buildWitchNightContext,
  buildSalvateurNightContext,
  buildCorbeauNightContext,
  buildCupidonNightContext,
} from "@/lib/context-builder";
import { callClaude, MODELS, TEMPERATURES } from "@/lib/anthropic";
import { findPlayer, parseName, parseWitchAction, isWolfRole } from "@/lib/game-engine";
import { debugLog } from "@/lib/debug";
import { applyRateLimit, extractByokKey, safeErrorMessage } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req);
  if (limited) return limited;
  const byokKey = extractByokKey(req);
  try {
    const body: NightRequest = await req.json();
    const { players, cycle, seerLog, potions, salvateurLastTarget, messages, history, lovers } = body;

    const alive = players.filter((p) => p.alive);
    const wolves = alive.filter((p) => isWolfRole(p.role));
    const seer = alive.find((p) => p.role === "Voyante") ?? null;
    const witch = alive.find((p) => p.role === "Sorcière") ?? null;
    const salvateur = alive.find((p) => p.role === "Salvateur") ?? null;
    const corbeau = alive.find((p) => p.role === "Corbeau") ?? null;
    const cupidon = alive.find((p) => p.role === "Cupidon") ?? null;
    const petiteFille = alive.find((p) => p.role === "Petite Fille") ?? null;
    const loupAlpha = alive.find((p) => p.role === "Loup Alpha") ?? null;

    // ── 1. CUPIDON (première nuit uniquement) ──
    let loversFormed: [string, string] | null = null;
    if (cupidon && cycle === 1 && !cupidon.isHuman) {
      const systemPrompt = buildSystemPrompt(cupidon, players);
      const userMessage = buildCupidonNightContext(players, cupidon);
      const raw = await callClaude({
        systemPrompt, userMessage,
        model: MODELS.villager, maxTokens: 50, temperature: TEMPERATURES.villager, byokKey,
      });
      const match = raw.match(/AMOUREUX:\s*([A-Za-zÀ-ÿ]+)\s*,\s*([A-Za-zÀ-ÿ]+)/i);
      if (match) {
        const p1 = findPlayer(players, match[1]);
        const p2 = findPlayer(players, match[2]);
        if (p1 && p2 && p1.name !== p2.name) {
          loversFormed = [p1.name, p2.name];
        }
      }
    }

    // ── 2. LOUPS ──
    let wolfTarget: string | null = null;
    let wolfReason: string | null = null;
    let alphaConverted: string | null = null;

    debugLog(`[WOLF CHAT] Nuit ${cycle}`);

    if (wolves.length > 0) {
      // Use the first alive wolf for decision (they coordinate)
      const decisionWolf = wolves.find((w) => !w.isHuman) ?? wolves[0];
      if (!decisionWolf.isHuman) {
        // Alpha conversion decision (AI only, once per game)
        if (loupAlpha && !loupAlpha.isHuman && !loupAlpha.alphaUsed && cycle >= 2) {
          // Alpha considers conversion from cycle 2 onwards (30% chance to attempt)
          const conversionChance = Math.random();
          if (conversionChance < 0.3) {
            const validConvertTargets = alive.filter((p) => !isWolfRole(p.role));
            // Prefer high-value targets: Voyante, Sorcière, then random
            const highValue = validConvertTargets.filter((p) =>
              p.role === "Voyante" || p.role === "Sorcière" || p.role === "Chasseur"
            );
            const convertTarget = highValue.length > 0
              ? highValue[Math.floor(Math.random() * highValue.length)]
              : validConvertTargets[Math.floor(Math.random() * validConvertTargets.length)];
            if (convertTarget) {
              alphaConverted = convertTarget.name;
              debugLog(`[WOLF CHAT] Loup Alpha convertit : ${convertTarget.name} (${convertTarget.role})`);
              // No wolfTarget this night — conversion replaces the kill
            }
          }
        }

        // Normal wolf target (only if no conversion this turn)
        if (!alphaConverted) {
          const systemPrompt = buildSystemPrompt(decisionWolf, players);
          const userMessage = buildWolfNightContext(players, decisionWolf, messages, history, cycle, lovers);
          const raw = await callClaude({
            systemPrompt, userMessage,
            model: MODELS.wolves, maxTokens: 200, temperature: TEMPERATURES.wolf, byokKey,
          });

          const parsed = parseName(raw, "CIBLE");
          const reasonMatch = raw.match(/RAISON:\s*(.+)/i);
          wolfReason = reasonMatch ? reasonMatch[1].trim() : null;

          const target = parsed ? findPlayer(players, parsed) : null;
          // A3: Filter out lover partner from valid targets
          let validTargets = alive.filter((p) => !isWolfRole(p.role));
          if (lovers) {
            const wolfLover = wolves.find((w) => w.name === lovers.player1 || w.name === lovers.player2);
            if (wolfLover) {
              const partnerName = wolfLover.name === lovers.player1 ? lovers.player2 : lovers.player1;
              validTargets = validTargets.filter((p) => p.name !== partnerName);
            }
          }

          debugLog(`[WOLF CHAT] Loup IA (${decisionWolf.name}) suggère : TARGET=${parsed || "?"} | RAISON="${wolfReason || "aucune"}"`);

          if (target && target.alive && !isWolfRole(target.role) && validTargets.some((p) => p.name === target.name)) {
            wolfTarget = target.name;
          } else if (validTargets.length > 0) {
            wolfTarget = validTargets[Math.floor(Math.random() * validTargets.length)].name;
            debugLog(`[WOLF CHAT] Cible invalide "${parsed}", fallback aléatoire → ${wolfTarget}`);
          }
        }
      } else {
        debugLog(`[WOLF CHAT] Loup humain (${decisionWolf.name}) — attend choix du joueur`);
      }
      // If human is wolf, wolfTarget will be set by the client
      debugLog(`[WOLF CHAT] Cible finale choisie : ${wolfTarget || (alphaConverted ? `CONVERT:${alphaConverted}` : "en attente (humain)")}`);

      // Debug: wolf-lover constraint check
      if (lovers && wolfTarget) {
        const wolfLover = wolves.find((w) => w.name === lovers.player1 || w.name === lovers.player2);
        if (wolfLover) {
          const partnerName = wolfLover.name === lovers.player1 ? lovers.player2 : lovers.player1;
          if (wolfTarget === partnerName) {
            debugLog(`[WOLF NIGHT] ⚠️ ${wolfLover.name} (loup, amoureux de ${partnerName}) — cible son amoureux !`);
          } else {
            debugLog(`[WOLF NIGHT] ${wolfLover.name} (loup, amoureux de ${partnerName}) — bloque ${partnerName} comme cible ✓`);
          }
        }
      }
    }

    // ── 3-6. VOYANTE + SALVATEUR + CORBEAU (parallèle) puis SORCIÈRE (séquentielle) ──
    let seerTarget: string | null = null;
    let seerResult: string | null = null;
    let salvateurTarget: string | null = null;
    let corbeauTarget: string | null = null;

    // These 3 are independent of wolfTarget → run in parallel
    const parallelTasks: Promise<void>[] = [];

    if (seer && !seer.isHuman) {
      parallelTasks.push((async () => {
        const systemPrompt = buildSystemPrompt(seer, players);
        const userMessage = buildSeerNightContext(players, seer, seerLog, messages, cycle);
        const raw = await callClaude({
          systemPrompt, userMessage,
          model: MODELS.seer, maxTokens: 100, temperature: TEMPERATURES.villager, byokKey,
        });
        const parsed = parseName(raw, "INSPECTE");
        const target = parsed ? findPlayer(players, parsed) : null;
        if (target && target.alive && target.name !== seer.name) {
          seerTarget = target.name;
          seerResult = target.role;
          debugLog(`[Voyante] inspecte ${seerTarget} → ${seerResult}`);
        }
      })());
    }

    if (salvateur && !salvateur.isHuman) {
      parallelTasks.push((async () => {
        const systemPrompt = buildSystemPrompt(salvateur, players);
        const userMessage = buildSalvateurNightContext(players, salvateur, salvateurLastTarget ?? null);
        const raw = await callClaude({
          systemPrompt, userMessage,
          model: MODELS.villager, maxTokens: 30, temperature: TEMPERATURES.villager, byokKey,
        });
        const parsed = parseName(raw, "PROTEGE");
        const target = parsed ? findPlayer(players, parsed) : null;
        if (target && target.alive && target.name !== (salvateurLastTarget ?? "")) {
          salvateurTarget = target.name;
        }
      })());
    }

    if (corbeau && !corbeau.isHuman) {
      parallelTasks.push((async () => {
        const systemPrompt = buildSystemPrompt(corbeau, players);
        const userMessage = buildCorbeauNightContext(players, corbeau);
        const raw = await callClaude({
          systemPrompt, userMessage,
          model: MODELS.villager, maxTokens: 30, temperature: TEMPERATURES.villager, byokKey,
        });
        const parsed = parseName(raw, "CORBEAU");
        if (parsed && parsed.toUpperCase() !== "PERSONNE") {
          const target = findPlayer(players, parsed);
          if (target && target.alive && target.name !== corbeau.name) {
            corbeauTarget = target.name;
          }
        }
      })());
    }

    await Promise.all(parallelTasks);

    // ── SORCIÈRE (séquentielle — dépend de wolfTarget) ──
    let witchAction: string | null = null;
    if (witch && !witch.isHuman && wolfTarget && (potions.heal || potions.poison)) {
      const systemPrompt = buildSystemPrompt(witch, players);
      const userMessage = buildWitchNightContext(wolfTarget, potions, players, cycle);
      const raw = await callClaude({
        systemPrompt, userMessage,
        model: MODELS.witch, maxTokens: 30, temperature: TEMPERATURES.villager, byokKey,
      });
      witchAction = parseWitchAction(raw);
      if (witchAction?.toUpperCase() === "SAUVER" && !potions.heal) {
        debugLog(`[WITCH] ⚠️ Sorcière tried to SAUVER but has no heal potion — forcing RIEN`);
        witchAction = "RIEN";
      }
      if (witchAction?.toUpperCase().startsWith("EMPOISONNER") && !potions.poison) {
        debugLog(`[WITCH] ⚠️ Sorcière tried to EMPOISONNER but has no poison potion — forcing RIEN`);
        witchAction = "RIEN";
      }
      if (wolfTarget === witch.name && potions.heal && witchAction?.toUpperCase() !== "SAUVER") {
        debugLog(`[WITCH] ⚠️ Sorcière is wolf target but chose "${witchAction}" — forcing SAUVER (self-preservation)`);
        witchAction = "SAUVER";
      }
      debugLog(`[WITCH] Action: ${witchAction} | Potions: heal=${potions.heal} poison=${potions.poison}`);
    }

    // ── 7. PETITE FILLE ──
    let petiteFilleResult: { saw: string | null; caught: boolean } | null = null;
    if (petiteFille && petiteFille.alive) {
      const seeChance = Math.random();
      const caughtChance = Math.random();
      let saw: string | null = null;
      const caught = caughtChance < 0.2;

      if (seeChance < 0.5 && wolves.length > 0) {
        const randomWolf = wolves[Math.floor(Math.random() * wolves.length)];
        saw = randomWolf.name;
      }

      petiteFilleResult = { saw, caught };
    }

    return NextResponse.json<NightResponse>({
      wolfTarget,
      wolfReason: wolfReason ?? undefined,
      seerTarget,
      seerResult,
      witchAction,
      salvateurTarget: salvateurTarget ?? undefined,
      corbeauTarget: corbeauTarget ?? undefined,
      petiteFilleResult: petiteFilleResult ?? undefined,
      alphaConverted: alphaConverted ?? undefined,
      loversFormed: loversFormed ?? undefined,
    });
  } catch (err: unknown) {
    if (byokKey && err instanceof Error && (err.message?.includes("401") || err.message?.includes("auth") || err.message?.includes("API key"))) {
      return NextResponse.json({ wolfTarget: null, seerTarget: null, seerResult: null, witchAction: null, byokError: "Clé API invalide. Vérifie-la sur console.anthropic.com" }, { status: 401 });
    }
    console.error("[/api/night]", safeErrorMessage(err));
    return NextResponse.json(
      { wolfTarget: null, seerTarget: null, seerResult: null, witchAction: null },
      { status: 500 }
    );
  }
}
