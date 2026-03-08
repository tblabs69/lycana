"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { debugLog } from "@/lib/debug";
import type {
  Player,
  Phase,
  Message,
  SeerEntry,
  NightResult,
  HistoryEntry,
  VoteReveal,
  Potions,
  Lovers,
  GameConfig,
  DebateRequest,
  DebateResponse,
  VoteRequest,
  VoteResponse,
  NightRequest,
  NightResponse,
  HunterRequest,
  HunterResponse,
  NarratorTransition,
  NarratorRequest,
  NarratorResponse,
  LoveChatRequest,
  LoveChatResponse,
  NotableAccusation,
} from "@/types/game";
import {
  getInitialPlayers,
  shuffle,
  findPlayer,
  checkWin,
  computeVoteResult,
  isFeminine,
  isHumanDead,
  isWolfRole,
  roleLabel,
  roleEmoji,
} from "@/lib/game-engine";
import { assignDirectives, getSkipMessage, getGroupSkipMessage, selectSpeakers, isPassDirective, getPassMessage, detectNotableAccusations } from "@/lib/context-builder";
import PlayerBar from "@/components/PlayerBar";
import ChatFeed from "@/components/ChatFeed";
import InputArea from "@/components/InputArea";
import ConfigScreen from "@/components/ConfigScreen";
import TutoModal from "@/components/TutoModal";
import PhaseOverlay from "@/components/PhaseOverlay";
import GameOverScreen from "@/components/GameOverScreen";
import RoleRevealCeremony from "@/components/RoleRevealCeremony";
import DeathReveal from "@/components/DeathReveal";
import DebugPanel from "@/components/DebugPanel";

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function GameBoard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<Phase>("config");
  const [cycle, setCycle] = useState(0);
  const [round, setRound] = useState(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [speaker, setSpeaker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [hVote, setHVote] = useState<string | null>(null);
  const [nResult, setNResult] = useState<NightResult | null>(null);
  const [potions, setPotions] = useState<Potions>({ heal: true, poison: true });
  const [seerLog, setSeerLog] = useState<SeerEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [winner, setWinner] = useState<"village" | "loups" | "couple" | null>(null);
  const [nText, setNText] = useState("");
  const [vReveals, setVReveals] = useState<VoteReveal[]>([]);
  const [hAlive, setHAlive] = useState(true);
  const [lovers, setLovers] = useState<Lovers | null>(null);
  const loversRef = useRef<Lovers | null>(null);
  const playersRef = useRef<Player[]>([]);
  const [salvateurLastTarget, setSalvateurLastTarget] = useState<string | null>(null);
  const [corbeauTarget, setCorbeauTarget] = useState<string | null>(null);
  const [humanNightAction, setHumanNightAction] = useState<string | null>(null);
  const [nightData, setNightData] = useState<NightResponse | null>(null);
  const [showTuto, setShowTuto] = useState(false);
  const [directives, setDirectives] = useState<Map<string, string>>(new Map());
  const [notableAccusations, setNotableAccusations] = useState<NotableAccusation[]>([]);
  const [roundSpeakers, setRoundSpeakers] = useState<Set<string>>(new Set());
  const [roundSkippers, setRoundSkippers] = useState<Set<string>>(new Set());
  const [previousSkippers, setPreviousSkippers] = useState<Set<string>>(new Set());
  const [loveChatInput, setLoveChatInput] = useState("");
  const [loveChatDone, setLoveChatDone] = useState(false);
  const [overlay, setOverlay] = useState<{ text: string; type: "night" | "dawn" | "debate" } | null>(null);
  const overlayResolveRef = useRef<(() => void) | null>(null);
  const [gameOverNarration, setGameOverNarration] = useState("");
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [deathReveal, setDeathReveal] = useState<{ player: Player; cause: string; causeIcon: string } | null>(null);
  const deathRevealResolveRef = useRef<(() => void) | null>(null);

  const [byokKey, setByokKey] = useState<string | null>(null);
  const [byokError, setByokError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.get("debug") === "true");
  }, []);

  // Keep playersRef in sync for async functions that need fresh state
  useEffect(() => { playersRef.current = players; }, [players]);

  const busy = useRef(false);
  const nextResolveRef = useRef<(() => void) | null>(null);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loveChatResolveRef = useRef<{ ps: Player[]; cy: number; nd: NightResponse; currentPotions: Potions } | null>(null);

  const showOverlay = useCallback((text: string, type: "night" | "dawn" | "debate"): Promise<void> => {
    overlayResolveRef.current?.(); // resolve any pending
    return new Promise((resolve) => {
      overlayResolveRef.current = resolve;
      setOverlay({ text, type });
    });
  }, []);

  const handleOverlayDone = useCallback(() => {
    setOverlay(null);
    overlayResolveRef.current?.();
    overlayResolveRef.current = null;
  }, []);

  // B1: Wait for player to click "Suivant" — hard block
  function waitForNext(): Promise<void> {
    return new Promise((resolve) => {
      nextResolveRef.current = resolve;
      setWaitingForNext(true);
    });
  }

  // B1: Resolve the waitForNext promise
  const handleNext = useCallback(() => {
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
      skipTimerRef.current = null;
    }
    setWaitingForNext(false);
    nextResolveRef.current?.();
    nextResolveRef.current = null;
  }, []);

  // B1: Soft wait — auto-advances after ms, but player can skip with "Suivant"
  function waitOrSkip(ms: number): Promise<void> {
    return new Promise((resolve) => {
      nextResolveRef.current = resolve;
      setWaitingForNext(true);
      skipTimerRef.current = setTimeout(() => {
        skipTimerRef.current = null;
        setWaitingForNext(false);
        nextResolveRef.current = null;
        resolve();
      }, ms);
    });
  }

  // C1: Show death ceremony overlay — returns promise resolved when player clicks Suivant
  function showDeathReveal(player: Player, cause: string, causeIcon: string): Promise<void> {
    return new Promise((resolve) => {
      deathRevealResolveRef.current = resolve;
      setDeathReveal({ player, cause, causeIcon });
    });
  }

  const handleDeathRevealDone = useCallback(() => {
    setDeathReveal(null);
    deathRevealResolveRef.current?.();
    deathRevealResolveRef.current = null;
  }, []);

  function addMsg(text: string, isSystem = false, extra: Partial<Message> = {}) {
    setMessages((prev) => [...prev, { text, isSystem, ...extra }]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const human = players.find((p) => p.isHuman) ?? null;
  const humanRole = human?.role ?? "Villageois";

  // ── API HELPERS ──────────────────────────────────────────────────────────

  /** Build headers for API calls — includes BYOK key if active */
  function apiHeaders(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    const key = byokKey || sessionStorage.getItem("lycana_byok");
    if (key) h["x-api-key"] = key;
    return h;
  }

  /** Fetch wrapper that handles BYOK errors */
  async function apiFetch(url: string, body: unknown): Promise<Response> {
    const res = await fetch(url, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      const data = await res.json();
      if (data.byokError) {
        setByokError(data.byokError);
        throw new Error(data.byokError);
      }
    }
    return res;
  }

  // ── API CALLS ─────────────────────────────────────────────────────────────

  async function callDebate(
    player: Player, currentPlayers: Player[], currentMessages: Message[],
    currentCycle: number, currentRound: number, currentNResult: NightResult | null,
    currentHistory: HistoryEntry[], currentSeerLog: SeerEntry[],
    directive?: string, currentAccusations?: NotableAccusation[]
  ): Promise<string> {
    const body: DebateRequest = {
      player, players: currentPlayers, messages: currentMessages,
      cycle: currentCycle, round: currentRound, nightResult: currentNResult,
      history: currentHistory, seerLog: currentSeerLog, lovers, directive,
      notableAccusations: currentAccusations,
    };
    const res = await apiFetch("/api/debate", body);
    const data: DebateResponse = await res.json();
    return data.text || "...";
  }

  async function callVote(
    player: Player, currentPlayers: Player[], currentMessages: Message[], currentCycle: number, contrarian?: boolean
  ): Promise<{ target: string; reason: string }> {
    const body: VoteRequest = { player, players: currentPlayers, messages: currentMessages, cycle: currentCycle, contrarian, lovers };
    const res = await apiFetch("/api/vote", body);
    const data: VoteResponse = await res.json();
    return { target: data.target || "abstention", reason: data.reason || "" };
  }

  async function callNight(
    currentPlayers: Player[], currentCycle: number,
    currentSeerLog: SeerEntry[], currentPotions: Potions
  ): Promise<NightResponse> {
    const body: NightRequest = {
      players: currentPlayers, cycle: currentCycle,
      seerLog: currentSeerLog, potions: currentPotions,
      lovers, salvateurLastTarget,
      messages, history,
    };
    const res = await apiFetch("/api/night", body);
    return res.json();
  }

  async function callHunter(hunter: Player, currentPlayers: Player[]): Promise<string> {
    const body: HunterRequest = { hunter, players: currentPlayers, messages, history, cycle };
    const res = await apiFetch("/api/hunter", body);
    const data: HunterResponse = await res.json();
    return data.target || "";
  }

  async function callNarrator(
    transition: NarratorTransition,
    cy: number,
    ps: Player[],
    context: Record<string, unknown>,
    fallback: string
  ): Promise<string> {
    try {
      const body: NarratorRequest = { transition, cycle: cy, players: ps, context };
      const res = await apiFetch("/api/narrator", body);
      const data: NarratorResponse = await res.json();
      return data.text || fallback;
    } catch {
      return fallback;
    }
  }

  async function callLoveChat(
    player: Player, partnerName: string, currentLovers: Lovers,
    cy: number, humanMessage?: string
  ): Promise<LoveChatResponse> {
    const body: LoveChatRequest = {
      player, partnerName, humanMessage, lovers: currentLovers, cycle: cy,
    };
    const res = await apiFetch("/api/love-chat", body);
    return res.json();
  }

  // ── NIGHT PHASE ───────────────────────────────────────────────────────────

  const runNight = useCallback(
    async (ps: Player[], cy: number) => {
      setPhase("night");
      setNText("");
      setHumanNightAction(null);
      setNightData(null);

      // Narrator: night falls
      const lastEvent = cy === 1
        ? "Premier cycle, pas de vote précédent"
        : (nResult?.deaths?.length
          ? `${nResult.deaths.map((d) => d.name).join(" et ")} tué(s) la nuit dernière`
          : "Pas de mort la nuit précédente");
      const nightNarration = await callNarrator("nightFalls", cy, ps,
        { lastEvent }, "La nuit tombe sur le village...");
      await showOverlay(nightNarration, "night");
      addMsg(nightNarration, true, { isNight: true, cycle: cy });

      setNText("Les loups ouvrent les yeux...");

      const currentPotions = potions;
      const nd = await callNight(ps, cy, seerLog, currentPotions);
      setNightData(nd);

      // Handle lovers formation (cycle 1)
      if (nd.loversFormed) {
        const [l1, l2] = nd.loversFormed;
        const p1 = findPlayer(ps, l1);
        const p2 = findPlayer(ps, l2);
        if (p1 && p2) {
          const isMixed =
            (isWolfRole(p1.role) && !isWolfRole(p2.role)) ||
            (!isWolfRole(p1.role) && isWolfRole(p2.role));
          const newLovers = { player1: l1, player2: l2, isMixedCouple: isMixed };
          setLovers(newLovers);
          loversRef.current = newLovers; // A1: immediate access for resolveNight
          debugLog(`[CUPIDON] Couple: ${l1} + ${l2} (mixte: ${isMixed})`);
          // B0a: Notify human if they are a lover
          const humanP = ps.find((p) => p.isHuman);
          if (humanP && (humanP.name === l1 || humanP.name === l2)) {
            const partnerName = humanP.name === l1 ? l2 : l1;
            addMsg(`💘 Cupidon a frappé ! Tu es amoureux${isFeminine(humanP.name, ps) ? "se" : ""} de ${partnerName}. Si l'un de vous meurt, l'autre meurt aussi.`, true, { isNight: true, cycle: cy });
          }
        }
      }

      // Seer log update (AI seer only — human seer is handled in continueNight)
      const humanP = ps.find((p) => p.isHuman && p.alive);
      if (nd.seerTarget && nd.seerResult && humanP?.role !== "Voyante") {
        setSeerLog((prev) => [...prev, { target: nd.seerTarget!, result: nd.seerResult!, cycle: cy }]);
      }

      // Check if human has a night role that needs input
      const humanPlayer = ps.find((p) => p.isHuman && p.alive);
      if (humanPlayer) {
        const needsInput = needsHumanNightAction(humanPlayer, cy, currentPotions, nd);
        if (needsInput) {
          setNText("");
          setPhase("humanNight");
          return; // Wait for human action, then continueNight is called
        }
      }

      // No human night action needed — resolve immediately
      await resolveNight(ps, cy, nd, currentPotions);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seerLog, potions, salvateurLastTarget, lovers]
  );

  function needsHumanNightAction(
    humanPlayer: Player, cy: number, currentPotions: Potions, nd: NightResponse
  ): boolean {
    switch (humanPlayer.role) {
      case "Loup-Garou":
      case "Loup Alpha":
        return true; // Choose target
      case "Voyante":
        return true; // Choose who to inspect
      case "Sorcière":
        return !!(nd.wolfTarget && (currentPotions.heal || currentPotions.poison));
      case "Salvateur":
        return true;
      case "Cupidon":
        return cy === 1; // Only first night
      case "Corbeau":
        return true;
      default:
        return false;
    }
  }

  // Called when human submits their night action
  async function continueNight(action: string) {
    const ps = players;
    const cy = cycle;
    const nd = nightData;
    if (!nd || !human) return;

    const currentPotions = potions;
    const updatedNd = { ...nd };

    // Debug: wolf lover constraint check
    if (isWolfRole(human.role) && lovers) {
      const isWolfLover = human.name === lovers.player1 || human.name === lovers.player2;
      if (isWolfLover) {
        const partnerName = human.name === lovers.player1 ? lovers.player2 : lovers.player1;
        if (action === partnerName || action === `CONVERT:${partnerName}`) {
          debugLog(`[WOLF NIGHT] ${human.name} (loup, amoureux de ${partnerName}) — cible son amoureux ⚠️`);
        } else {
          debugLog(`[WOLF NIGHT] ${human.name} (loup, amoureux de ${partnerName}) — bloque ${partnerName} comme cible ✓`);
        }
      }
    }

    switch (human.role) {
      case "Loup-Garou":
        updatedNd.wolfTarget = action;
        debugLog(`[WOLF NIGHT] Humain loup choisit : ${action}`);
        break;
      case "Loup Alpha":
        if (action.startsWith("CONVERT:")) {
          const convertName = action.replace("CONVERT:", "");
          updatedNd.alphaConverted = convertName;
          updatedNd.wolfTarget = null; // No kill this night — conversion instead
          debugLog(`[WOLF NIGHT] Humain Loup Alpha convertit : ${convertName}`);
        } else {
          updatedNd.wolfTarget = action;
          debugLog(`[WOLF NIGHT] Humain Loup Alpha dévore : ${action}`);
        }
        break;
      case "Voyante": {
        const target = findPlayer(ps, action);
        if (target) {
          updatedNd.seerTarget = target.name;
          updatedNd.seerResult = target.role;
          setSeerLog((prev) => [...prev, { target: target.name, result: target.role, cycle: cy }]);
          // Show result to human — brief pause, no waitForNext (Suivant button not shown during humanNight)
          addMsg(`🔮 ${target.name} est : ${target.role}`, true, { isNight: true, cycle: cy });
          await new Promise((r) => setTimeout(r, 1500));
        }
        break;
      }
      case "Sorcière":
        updatedNd.witchAction = action;
        break;
      case "Salvateur":
        updatedNd.salvateurTarget = action;
        setSalvateurLastTarget(action);
        break;
      case "Cupidon": {
        const names = action.split(",").map((n) => n.trim());
        if (names.length === 2) {
          const p1 = findPlayer(ps, names[0]);
          const p2 = findPlayer(ps, names[1]);
          if (p1 && p2) {
            updatedNd.loversFormed = [p1.name, p2.name];
            const isMixed =
              (isWolfRole(p1.role) && !isWolfRole(p2.role)) ||
              (!isWolfRole(p1.role) && isWolfRole(p2.role));
            const humanLovers = { player1: p1.name, player2: p2.name, isMixedCouple: isMixed };
            setLovers(humanLovers);
            loversRef.current = humanLovers;
            debugLog(`[CUPIDON] Couple: ${p1.name} + ${p2.name} (mixte: ${isMixed})`);
          }
        }
        break;
      }
      case "Corbeau": {
        if (action && action.toUpperCase() !== "PERSONNE") {
          updatedNd.corbeauTarget = action;
          setCorbeauTarget(action);
        }
        break;
      }
    }

    setPhase("night");
    setNText("Résolution de la nuit...");
    await resolveNight(ps, cy, updatedNd, currentPotions);
  }

  // B0d: Handle human love chat submission
  async function handleLoveChatSubmit(message: string) {
    const ref = loveChatResolveRef.current;
    if (!ref) return;
    const { ps, cy, nd, currentPotions } = ref;
    const currentLoversChat = loversRef.current;
    if (!currentLoversChat) return;

    const humanP = ps.find((p) => p.isHuman);
    if (!humanP) return;
    const partnerName = humanP.name === currentLoversChat.player1 ? currentLoversChat.player2 : currentLoversChat.player1;
    const partner = findPlayer(ps, partnerName);
    if (!partner) return;

    // Show human's message
    addMsg(message, false, {
      speaker: humanP.name, isHuman: true, emoji: humanP.emoji, color: "#ec4899", cycle: cy, isNight: true,
    });

    setLoading(true);
    // Get AI partner's response
    const resp = await callLoveChat(partner, humanP.name, currentLoversChat, cy, message);
    setLoading(false);

    // Show AI response
    addMsg(resp.text, false, {
      speaker: partner.name, emoji: partner.emoji, color: "#ec4899", cycle: cy, isNight: true,
    });

    // Check role reveal
    if (resp.revealedRole && currentLoversChat.isMixedCouple) {
      const updated = { ...currentLoversChat, coupleKnowsMixedStatus: true };
      setLovers(updated);
      loversRef.current = updated;
    }

    setLoveChatDone(true);
    await waitForNext();

    // Continue to resolve night
    setPhase("night");
    setNText("Résolution de la nuit...");
    loveChatResolveRef.current = null;
    await resolveNightPostChat(ps, cy, nd, currentPotions);
  }

  // B0d: Skip love chat
  async function handleLoveChatSkip() {
    const ref = loveChatResolveRef.current;
    if (!ref) return;
    const { ps, cy, nd, currentPotions } = ref;
    setPhase("night");
    setNText("Résolution de la nuit...");
    loveChatResolveRef.current = null;
    await resolveNightPostChat(ps, cy, nd, currentPotions);
  }

  async function resolveNight(
    ps: Player[], cy: number, nd: NightResponse, currentPotions: Potions
  ) {
    const { wolfTarget, witchAction, salvateurTarget: salvTarget, petiteFilleResult, alphaConverted } = nd;

    // Store corbeau target for vote phase
    if (nd.corbeauTarget) setCorbeauTarget(nd.corbeauTarget);
    if (salvTarget) setSalvateurLastTarget(salvTarget);

    setNText("");

    // B0d: Love chat phase — both lovers must be alive
    const currentLoversForChat = loversRef.current;
    if (currentLoversForChat) {
      const lover1 = findPlayer(ps, currentLoversForChat.player1);
      const lover2 = findPlayer(ps, currentLoversForChat.player2);
      if (lover1?.alive && lover2?.alive) {
        const humanIsLover = lover1.isHuman || lover2.isHuman;
        if (humanIsLover) {
          // Human is a lover — show love chat UI, wait for input
          setLoveChatDone(false);
          setLoveChatInput("");
          setPhase("loveChat");
          // Store nd and potions for after chat completes
          loveChatResolveRef.current = { ps, cy, nd, currentPotions };
          return; // Will continue via handleLoveChatSubmit
        } else {
          // Both AI lovers — run 1 exchange
          setNText(""); // Love chat is private — no visible indicator
          const aiLover1 = lover1;
          const aiLover2 = lover2;
          const resp1 = await callLoveChat(aiLover1, aiLover2.name, currentLoversForChat, cy);
          const resp2 = await callLoveChat(aiLover2, aiLover1.name, currentLoversForChat, cy, resp1.text);
          // Check if both revealed roles → set coupleKnowsMixedStatus
          if (resp1.revealedRole && resp2.revealedRole && currentLoversForChat.isMixedCouple) {
            const updated = { ...currentLoversForChat, coupleKnowsMixedStatus: true };
            setLovers(updated);
            loversRef.current = updated;
            debugLog(`[LOVERS] Both AI lovers revealed roles — mixed couple status known`);
          }
          // Love chat is private — only log to console, don't show in public chat
          debugLog(`[LOVERS] ${aiLover1.name} et ${aiLover2.name} chuchotent (privé)`);
          await new Promise((r) => setTimeout(r, 800));
          setNText("");
        }
      }
    }

    await resolveNightPostChat(ps, cy, nd, currentPotions);
  }

  async function resolveNightPostChat(
    ps: Player[], cy: number, nd: NightResponse, currentPotions: Potions
  ) {
    const { wolfTarget, witchAction, salvateurTarget: salvTarget, petiteFilleResult, alphaConverted } = nd;

    // Resolve deaths
    const deaths: Player[] = [];
    let saved = false;

    // Check Salvateur protection
    const isProtectedBySalvateur = wolfTarget && salvTarget && wolfTarget === salvTarget;

    // Check Ancien first-attack immunity
    const ancienTarget = wolfTarget ? findPlayer(ps, wolfTarget) : null;
    const isAncienFirstAttack = ancienTarget?.role === "Ancien" && !ancienTarget.ancienUsed;

    if (witchAction?.toUpperCase() === "SAUVER" && currentPotions.heal) {
      saved = true;
      setPotions((p) => ({ ...p, heal: false }));
    } else if (isProtectedBySalvateur) {
      saved = true;
    } else if (isAncienFirstAttack) {
      // Ancien survives first attack
      saved = true;
      // Mark ancien as used
      ps = ps.map((p) =>
        p.name === ancienTarget!.name ? { ...p, ancienUsed: true } : p
      );
      setPlayers(ps);
    } else if (wolfTarget) {
      const v = findPlayer(ps, wolfTarget);
      if (v && v.alive) deaths.push(v);
    }

    // Witch poison
    if (witchAction?.toUpperCase().startsWith("EMPOISONNER") && currentPotions.poison) {
      const poisonName = witchAction.split(/\s+/)[1];
      const pt = findPlayer(ps, poisonName);
      if (pt && pt.alive && !deaths.find((d) => d.name === pt.name)) {
        deaths.push(pt);
      }
      setPotions((p) => ({ ...p, poison: false }));
    }

    // Petite Fille caught
    if (petiteFilleResult?.caught) {
      const pf = ps.find((p) => p.role === "Petite Fille" && p.alive);
      if (pf && !deaths.find((d) => d.name === pf.name)) {
        deaths.push(pf);
      }
    }

    // Petite Fille saw a wolf — show to human if human is Petite Fille
    if (petiteFilleResult?.saw) {
      const pf = ps.find((p) => p.role === "Petite Fille" && p.alive);
      if (pf?.isHuman && !petiteFilleResult.caught) {
        addMsg(`👧 Tu as espionné... ${petiteFilleResult.saw} est un Loup !`, true, { isNight: true, cycle: cy });
      }
    }

    // Alpha conversion
    if (alphaConverted) {
      const converted = findPlayer(ps, alphaConverted);
      if (converted && converted.alive) {
        ps = ps.map((p) =>
          p.name === converted.name ? { ...p, role: "Loup-Garou" } : p
        );
        ps = ps.map((p) =>
          p.role === "Loup Alpha" ? { ...p, alphaUsed: true } : p
        );
        setPlayers(ps);
        addMsg(`🐺 Un villageois a été converti par le Loup Alpha...`, true, { isNight: true, cycle: cy });
      }
    }

    const nr: NightResult = { wolfTarget, saved, deaths, corbeauTarget: nd.corbeauTarget, petiteFilleResult, salvateurTarget: salvTarget, alphaConverted, loversFormed: nd.loversFormed };
    setNResult(nr);

    // Apply deaths
    const nightHunter = deaths.find((d) => d.role === "Chasseur") ?? null;
    let up = deaths.reduce(
      (acc, d) =>
        acc.map((p) =>
          p.name === d.name ? { ...p, alive: false, revealedRole: true } : p
        ),
      [...ps]
    );

    // A1: Lovers die together — use ref for immediate access (state may not be flushed)
    const currentLovers = loversRef.current;
    const loverDeaths: string[] = [];
    if (currentLovers) {
      for (const d of deaths) {
        if (d.name === currentLovers.player1 || d.name === currentLovers.player2) {
          const partnerName = d.name === currentLovers.player1 ? currentLovers.player2 : currentLovers.player1;
          const partner = findPlayer(up, partnerName);
          if (partner && partner.alive) {
            up = up.map((p) =>
              p.name === partnerName ? { ...p, alive: false, revealedRole: true } : p
            );
            loverDeaths.push(partnerName);
            debugLog(`[LOVERS] ${partnerName} meurt de chagrin (partenaire: ${d.name})`);
          }
        }
      }
    }

    setPlayers(up);
    if (isHumanDead(up)) setHAlive(false);

    setPhase("dawn");

    // Dawn messages — narrator
    const allDeaths = up.filter((p) => !p.alive && ps.find((pp) => pp.name === p.name)?.alive);
    const victimNames = allDeaths.map((d) => d.name);
    debugLog(`[NARRATOR] Calling dawn narrator with deaths: [${victimNames.join(", ")}]`);
    const savedReason = saved
      ? (witchAction?.toUpperCase() === "SAUVER" ? "la Sorcière a sauvé quelqu'un" : "le Salvateur a protégé la cible")
      : undefined;
    const dawnNarration = await callNarrator("dawn", cy, up,
      { victims: victimNames, savedReason },
      allDeaths.length
        ? `${allDeaths.map((d) => d.name + " (" + d.role + ")").join(" et ")} ne ${allDeaths.length > 1 ? "verront" : "verra"} plus le soleil.`
        : "Personne n'a été pris cette nuit."
    );
    await showOverlay(dawnNarration, "dawn");
    addMsg(dawnNarration, true, { isDawn: true, cycle: cy });
    // C1: Death reveal ceremonies
    if (allDeaths.length) {
      for (const d of allDeaths) {
        let cause = "";
        let causeIcon = "💀";
        if (wolfTarget && d.name === wolfTarget && !saved) {
          const fem = isFeminine(d.name, up);
          cause = `Dévoré${fem ? "e" : ""} par les loups`;
          causeIcon = "🐺";
        } else if (petiteFilleResult?.caught && d.role === "Petite Fille") {
          const fem = isFeminine(d.name, up);
          cause = `Repéré${fem ? "e" : ""} en espionnant les loups`;
          causeIcon = "👧";
        } else if (witchAction?.toUpperCase().startsWith("EMPOISONNER") && d.name !== wolfTarget) {
          const fem = isFeminine(d.name, up);
          cause = `Empoisonné${fem ? "e" : ""} durant la nuit`;
          causeIcon = "🧪";
        } else if (loverDeaths.includes(d.name)) {
          const partnerName = currentLovers!.player1 === d.name ? currentLovers!.player2 : currentLovers!.player1;
          const fem = isFeminine(d.name, up);
          cause = `Meurt de chagrin — ${fem ? "elle" : "il"} était l'${fem ? "Amoureuse" : "Amoureux"} de ${partnerName}`;
          causeIcon = "💔";
        } else {
          cause = "N'a pas survécu à la nuit";
          causeIcon = "💀";
        }
        await showDeathReveal(d, cause, causeIcon);
        addMsg(`${causeIcon} ${d.name} — ${cause}. (${d.role})`, true, { isDawn: true, cycle: cy });
      }
    }

    if (allDeaths.find((d) => d.isHuman)) {
      addMsg("💀 Tu es mort. Tu observes en silence...", true, { cycle: cy });
      await waitForNext();
    }

    // Corbeau announcement — only if target is still alive after night
    if (nd.corbeauTarget) {
      const corbeauP = findPlayer(up, nd.corbeauTarget);
      if (corbeauP && corbeauP.alive) {
        addMsg(`🐦 ${nd.corbeauTarget} commence avec 2 voix contre ${isFeminine(nd.corbeauTarget, up) ? "elle" : "lui"}.`, true, { isDawn: true, cycle: cy });
        await waitOrSkip(2000);
      } else {
        setCorbeauTarget(null);
      }
    }

    // Hunter
    if (nightHunter) {
      addMsg(`🎯 ${nightHunter.name} était le Chasseur !`, true, { isDawn: true, cycle: cy });
      await waitForNext();

      if (nightHunter.isHuman) {
        setPhase("hunterShot");
        return;
      }

      const shotTarget = await callHunter(nightHunter, up);
      const shot = findPlayer(up, shotTarget);
      if (shot && shot.alive) {
        up = up.map((p) =>
          p.name === shot.name ? { ...p, alive: false, revealedRole: true } : p
        );
        setPlayers(up);
        if (isHumanDead(up)) setHAlive(false);
        addMsg(
          `Chasseur emporte ${shot.name} (${shot.role}) ! ${
            isWolfRole(shot.role) ? "🎉 Loup!" : "💀 Innocent..."
          }`,
          true, { isDawn: true, cycle: cy }
        );
      }
    }

    await finishDawn(up, cy);
  }

  async function handleHunterShot(targetName: string) {
    const up = [...players];
    const shot = findPlayer(up, targetName);
    if (shot && shot.alive) {
      const updated = up.map((p) =>
        p.name === shot.name ? { ...p, alive: false, revealedRole: true } : p
      );
      setPlayers(updated);
      if (isHumanDead(updated)) setHAlive(false);
      addMsg(
        `Chasseur emporte ${shot.name} (${shot.role}) ! ${
          isWolfRole(shot.role) ? "🎉 Loup!" : "💀 Innocent..."
        }`,
        true, { isDawn: true, cycle }
      );
      await finishDawn(updated, cycle);
    }
  }

  async function finishDawn(up: Player[], cy: number) {
    const v = checkWin(up, lovers);
    if (v) {
      endGame(v, up, cy);
      return;
    }

    // Narrator: debate start
    const nightDeaths = up.filter((p) => !p.alive && players.find((pp) => pp.name === p.name)?.alive).map((d) => d.name);
    const debateNarration = await callNarrator("debateStart", cy, up,
      { nightDeaths }, "Les survivants se rassemblent.");
    await showOverlay(debateNarration, "debate");
    addMsg(debateNarration, true, { cycle: cy });

    // Compute speakers/skippers and directives for round 1
    const alivePs = up.filter((p) => p.alive);
    const { speakers, skippers } = selectSpeakers(alivePs, 1, previousSkippers, messages, cy, corbeauTarget);
    setRoundSpeakers(speakers);
    setRoundSkippers(skippers);
    const aiNames = alivePs.filter((p) => !p.isHuman).map((p) => p.name);
    const newDirectives = assignDirectives(aiNames);

    // C2: Last wolf aggressive mode — override directive for lone surviving wolf
    const aliveWolves = alivePs.filter((p) => isWolfRole(p.role));
    if (aliveWolves.length === 1 && !aliveWolves[0].isHuman) {
      newDirectives.set(aliveWolves[0].name,
        "Tu es le DERNIER loup. Tu es acculé. Sois AGRESSIF : accuse quelqu'un avec conviction, retourne les soupçons, crée la confusion. Ta survie en dépend."
      );
    }

    setDirectives(newDirectives);

    // Debug: log directives + lover constraints
    debugLog(`[DEBATE] Cycle ${cy} Tour 1 — Directives assignées :`);
    newDirectives.forEach((dir, name) => {
      const p = alivePs.find((pl) => pl.name === name);
      const loverInfo = lovers && (name === lovers.player1 || name === lovers.player2)
        ? ` (amoureux de ${name === lovers.player1 ? lovers.player2 : lovers.player1})`
        : "";
      const roleInfo = p ? ` [${p.role}]` : "";
      debugLog(`  [DEBATE] ${name}${roleInfo}${loverInfo} — directive: "${dir.substring(0, 60)}${dir.length > 60 ? "..." : ""}"`);
    });

    setOrder(shuffle(alivePs.map((p) => p.name)));
    setIdx(0);
    setRound(1);
    setPhase("debate");
  }

  // ── DEBATE PHASE ──────────────────────────────────────────────────────────

  const next = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;

    if (idx >= order.length) {
      if (round === 1) {
        setPhase("roundTransition");
      } else if (round === 2) {
        // C6: Check if debate is contested — trigger bonus round 3
        const currentMsgs = messages.filter((m) => m.cycle === cycle && !m.isSystem && m.speaker);
        const mentionCounts = new Map<string, number>();
        const aliveNames = players.filter((p) => p.alive).map((p) => p.name);
        for (const msg of currentMsgs) {
          for (const name of aliveNames) {
            if (name !== msg.speaker && msg.text.toLowerCase().includes(name.toLowerCase())) {
              mentionCounts.set(name, (mentionCounts.get(name) || 0) + 1);
            }
          }
        }
        const sorted = [...mentionCounts.entries()].sort((a, b) => b[1] - a[1]);
        const isContested = sorted.length >= 2 && sorted[0][1] > 0 && sorted[1][1] >= sorted[0][1] * 0.6;

        if (isContested) {
          // Bonus round: only the top 2-3 accused get to speak
          const topAccused = sorted.slice(0, 3).map(([name]) => name);
          addMsg(`⚡ Débat serré ! ${topAccused.join(" et ")} ont un dernier mot.`, true, { cycle });
          setOrder(topAccused.filter((n) => players.find((p) => p.name === n)?.alive));
          setIdx(0);
          setRound(3);
          setPhase("debate");
          busy.current = false;
          return;
        }

        // Detect notable accusations from this cycle's debate
        const newAccusations = detectNotableAccusations(messages, players, cycle);
        if (newAccusations.length > 0) {
          setNotableAccusations((prev) => [...prev, ...newAccusations]);
          debugLog(`[ACCUSATIONS] Detected ${newAccusations.length} notable accusations in cycle ${cycle}:`,
            newAccusations.map((a) => `${a.accuserName} → ${a.targetName}`));
        }
        setPhase(hAlive ? "voteHuman" : "voteAuto");
      } else {
        // Round 3 (bonus) ended — go to vote
        const newAccusations = detectNotableAccusations(messages, players, cycle);
        if (newAccusations.length > 0) {
          setNotableAccusations((prev) => [...prev, ...newAccusations]);
        }
        setPhase(hAlive ? "voteHuman" : "voteAuto");
      }
      busy.current = false;
      return;
    }

    const name = order[idx];
    const pl = players.find((p) => p.name === name);

    if (!pl || !pl.alive) {
      setIdx((i) => i + 1);
      busy.current = false;
      return;
    }

    // Idiot who lost voting rights can still speak
    if (pl.isHuman && hAlive) {
      setPhase("humanTurn");
      setSpeaker(name);
      busy.current = false;
      return;
    }

    if (pl.isHuman && !hAlive) {
      setIdx((i) => i + 1);
      busy.current = false;
      return;
    }

    // Check if this AI is a skipper (10+ player optimization)
    if (roundSkippers.has(name)) {
      // C3: Collect consecutive skippers into a group message
      const skipperBatch: string[] = [name];
      let peekIdx = idx + 1;
      while (peekIdx < order.length) {
        const nextName = order[peekIdx];
        const nextPl = players.find((p) => p.name === nextName);
        if (nextPl && nextPl.alive && !nextPl.isHuman && roundSkippers.has(nextName)) {
          skipperBatch.push(nextName);
          peekIdx++;
        } else {
          break;
        }
      }
      await waitOrSkip(400);
      if (skipperBatch.length > 1) {
        addMsg(getGroupSkipMessage(skipperBatch), true, { cycle });
      } else {
        addMsg(getSkipMessage(name), true, { speaker: name, emoji: pl.emoji, color: pl.color, cycle });
      }
      setIdx(peekIdx); // Skip all batched skippers
      busy.current = false;
      return;
    }

    const directive = directives.get(name);

    // Skip API call for "PASSE" directives — generate local message
    if (isPassDirective(directive) && !isWolfRole(pl.role) && pl.role !== "Voyante") {
      await waitOrSkip(400);
      addMsg(getPassMessage(), false, { speaker: name, emoji: pl.emoji, color: pl.color, cycle });
      setIdx((i) => i + 1);
      busy.current = false;
      return;
    }

    setSpeaker(name);
    setLoading(true);

    const text = await callDebate(pl, players, messages, cycle, round, nResult, history, seerLog, directive, notableAccusations);

    // C1: Filter out vacuous/empty right-of-reply messages
    const VACUOUS_PATTERNS = /^(hmm\.?|j'observe\.?|rien à ajouter\.?|je passe\.?|mouais\.?|on verra\.?|\.{1,3}|je préfère écouter\.?|pas d'avis\.?)$/i;
    if (text.trim().length < 3 || VACUOUS_PATTERNS.test(text.trim())) {
      setLoading(false);
      setSpeaker(null);
      setIdx((i) => i + 1);
      busy.current = false;
      return;
    }

    addMsg(text, false, { speaker: name, emoji: pl.emoji, color: pl.color, cycle });

    setLoading(false);
    setSpeaker(null);
    // A2: Wait for player to click Suivant before showing next message
    await waitForNext();
    setIdx((i) => i + 1);
    busy.current = false;
  }, [idx, order, players, messages, cycle, round, nResult, history, seerLog, hAlive, roundSkippers, directives, notableAccusations]);

  useEffect(() => {
    if (phase === "debate" && !loading && !busy.current && !waitingForNext) {
      const t = setTimeout(next, 300);
      return () => clearTimeout(t);
    }
  }, [phase, idx, loading, next, waitingForNext]);

  useEffect(() => {
    if (phase === "voteAuto") doVotes(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === "voteAI" && hVote !== null) doVotes(hVote);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, hVote]);

  // ── VOTE PHASE ────────────────────────────────────────────────────────────

  async function doVotes(humanVote: string | null) {
    setLoading(true);
    const currentPlayers = playersRef.current;
    const ais = currentPlayers.filter((p) => p.alive && !p.isHuman && !p.idiotRevealed);

    // B2: Assign contrarian to ~30% of voters for vote diversity
    const contrarianCount = Math.max(1, Math.round(ais.length * 0.3));
    const shuffledIndices = shuffle(ais.map((_, i) => i));
    const contrarianSet = new Set(shuffledIndices.slice(0, contrarianCount));

    // BATCH VOTE: 1 API call instead of N
    const voters = ais.map((p, i) => ({
      name: p.name,
      archetype: p.archetype || p.name,
      role: p.role,
      contrarian: contrarianSet.has(i),
    }));

    let aiVoteResults: { player: typeof ais[0]; target: string; reason: string }[] = [];
    try {
      const res = await apiFetch("/api/vote-batch", { voters, players: currentPlayers, messages, cycle, lovers });
      const data = await res.json();
      if (data.votes && data.votes.length > 0) {
        aiVoteResults = data.votes.map((v: { voter: string; target: string; reason: string }) => {
          const player = ais.find((p) => p.name === v.voter) || ais[0];
          return { player, target: v.target, reason: v.reason };
        });
      }
    } catch (err) {
      console.error("[vote-batch] Batch failed, falling back to individual:", err);
      // Fallback: individual votes in parallel
      const fallbackResults = await Promise.all(
        ais.map(async (p, i) => {
          const isContrarian = contrarianSet.has(i);
          const { target, reason } = await callVote(p, currentPlayers, messages, cycle, isContrarian);
          return { player: p, target, reason };
        })
      );
      aiVoteResults.push(...fallbackResults);
    }

    const aiVotes: Record<string, string> = {};
    aiVoteResults.forEach(({ player: p, target }) => {
      aiVotes[p.name] = target;
    });

    // Debug: vote impact logs
    debugLog(`[VOTE] Cycle ${cycle} — Résultats :`);
    aiVoteResults.forEach(({ player: p, target, reason }) => {
      const isLover = lovers && (p.name === lovers.player1 || p.name === lovers.player2);
      const partnerName = isLover ? (p.name === lovers!.player1 ? lovers!.player2 : lovers!.player1) : null;
      const loverCheck = isLover && partnerName
        ? (target === partnerName ? " ⚠️ VOTE CONTRE AMOUREUX !" : ` (PAS ${partnerName} ✓ — contrainte amoureux respectée)`)
        : "";
      const wolfCheck = isWolfRole(p.role) ? " [LOUP]" : "";
      debugLog(`  [VOTE] ${p.name}${wolfCheck} vote → ${target}${loverCheck} | "${reason}"`);
    });

    const allReveals: VoteReveal[] = [];
    if (humanVote && human) {
      allReveals.push({ voter: human.name, target: humanVote, isHuman: true, reason: "" });
    }
    aiVoteResults.forEach(({ player: p, target, reason }) => {
      allReveals.push({ voter: p.name, target, reason });
    });

    setVReveals([]);
    for (let i = 0; i < allReveals.length; i++) {
      await waitOrSkip(600);
      setVReveals((prev) => [...prev, allReveals[i]]);
    }

    setLoading(false);
    await waitForNext();

    // B4: Persist votes as permanent chat messages
    const voteSummary = allReveals.map((v) => `${v.voter} → ${v.target}`).join(" | ");
    addMsg(`🗳️ ${voteSummary}`, true, { cycle });

    const { eliminated, tie } = computeVoteResult(aiVotes, humanVote, corbeauTarget);
    setCorbeauTarget(null); // Reset for next cycle

    if (tie || !eliminated) {
      const tieNarration = await callNarrator("voteResult", cycle, currentPlayers, {
        eliminated: "personne",
        role: "aucun",
        isWolf: false,
        score: "égalité",
      }, "Égalité ! Pas d'élimination.");
      addMsg(tieNarration, true, { cycle });
      const tieEntry: HistoryEntry = { cycle, nightDeaths: (nResult?.deaths ?? []).map((d) => d.name), nightDeath: nResult?.deaths?.[0]?.name ?? null, voteDeath: null, voteRole: null, hunterDeath: null };
      setHistory((prev) => [...prev, tieEntry]);
      await waitForNext();
      goNext(currentPlayers, tieEntry);
      return;
    }

    const ep = findPlayer(currentPlayers, eliminated);
    const isWolf = ep ? isWolfRole(ep.role) : false;
    const isHunter = ep?.role === "Chasseur";
    const isAncien = ep?.role === "Ancien";
    const isIdiot = ep?.role === "Idiot du Village" && !ep.idiotRevealed;
    const fem = ep ? isFeminine(ep.name, currentPlayers) : false;

    // Idiot du Village survives first vote
    if (isIdiot && ep) {
      let up = currentPlayers.map((p) =>
        p.name === ep.name ? { ...p, idiotRevealed: true, revealedRole: true } : p
      );
      setPlayers(up);
      addMsg(
        `${eliminated} est l'Idiot du Village ! ${fem ? "Elle" : "Il"} survit mais perd le droit de vote. 🤪`,
        true, { cycle }
      );
      const idiotEntry: HistoryEntry = { cycle, nightDeaths: (nResult?.deaths ?? []).map((d) => d.name), nightDeath: nResult?.deaths?.[0]?.name ?? null, voteDeath: null, voteRole: "Idiot du Village", hunterDeath: null };
      setHistory((prev) => [...prev, idiotEntry]);
      await waitForNext();
      goNext(up, idiotEntry);
      return;
    }

    let up = currentPlayers.map((p) =>
      p.name === ep?.name ? { ...p, alive: false, revealedRole: true } : p
    );
    setPlayers(up);
    if (isHumanDead(up)) setHAlive(false);

    // C1: Death reveal ceremony for vote elimination
    if (ep) {
      await showDeathReveal(ep, `Éliminé${fem ? "e" : ""} par le village`, "🗳️");
    }

    // Narrator: vote result
    const voteNarration = await callNarrator("voteResult", cycle, up, {
      eliminated,
      role: ep?.role ?? "Villageois",
      isWolf,
    }, `${eliminated} éliminé${fem ? "e" : ""}. ${isWolf ? "Loup-Garou 🐺 !" : (ep?.role ?? "") + "."}`);
    addMsg(voteNarration, true, { cycle, isDawn: isWolf });
    await waitForNext();

    // Ancien eliminated by vote = village loses powers
    if (isAncien && ep) {
      addMsg("⚠️ L'Ancien a été éliminé par le village ! Tous les rôles spéciaux perdent leurs pouvoirs.", true, { cycle });
      await waitForNext();
    }

    // Lovers die together — use ref for reliable access
    const voteLovers = loversRef.current;
    if (voteLovers && ep) {
      if (ep.name === voteLovers.player1 || ep.name === voteLovers.player2) {
        const partnerName = ep.name === voteLovers.player1 ? voteLovers.player2 : voteLovers.player1;
        const partner = findPlayer(up, partnerName);
        if (partner && partner.alive) {
          up = up.map((p) =>
            p.name === partnerName ? { ...p, alive: false, revealedRole: true } : p
          );
          setPlayers(up);
          if (isHumanDead(up)) setHAlive(false);
          const femP = isFeminine(partnerName, currentPlayers);
          await showDeathReveal(partner, `Meurt de chagrin — ${femP ? "elle" : "il"} était l'${femP ? "Amoureuse" : "Amoureux"} de ${eliminated}`, "💔");
          addMsg(
            `💔 ${partnerName} meurt de chagrin — ${femP ? "elle" : "il"} était l'Amoureux de ${eliminated}.`,
            true, { cycle }
          );
        }
      }
    }

    let hunterDeath: string | null = null;

    if (isHunter && ep) {
      addMsg(`🎯 ${eliminated} était le Chasseur !`, true, { cycle });
      await waitForNext();

      if (ep.isHuman) {
        setPhase("hunterShot");
        return;
      }

      const shotTarget = await callHunter(ep, up);
      const shot = findPlayer(up, shotTarget);
      if (shot && shot.alive) {
        up = up.map((p) =>
          p.name === shot.name ? { ...p, alive: false, revealedRole: true } : p
        );
        setPlayers(up);
        if (isHumanDead(up)) setHAlive(false);
        hunterDeath = shot.name;
        addMsg(
          `Chasseur emporte ${shot.name} (${shot.role}) ! ${
            isWolfRole(shot.role) ? "🎉" : "💀"
          }`,
          true, { cycle }
        );
      }
    }

    const historyEntry: HistoryEntry = {
      cycle,
      nightDeaths: (nResult?.deaths ?? []).map((d) => d.name),
      nightDeath: nResult?.deaths?.[0]?.name ?? null,
      voteDeath: eliminated,
      voteRole: ep?.role ?? null,
      hunterDeath,
    };
    setHistory((prev) => [...prev, historyEntry]);

    // Update notable accusations: mark accusers who died this cycle
    const deadThisCycle = new Set([
      ...(nResult?.deaths ?? []).map((d) => d.name),
      ...(eliminated ? [eliminated] : []),
      ...(hunterDeath ? [hunterDeath] : []),
    ]);
    if (deadThisCycle.size > 0) {
      setNotableAccusations((prev) =>
        prev.map((a) => {
          if (a.cycle === cycle && deadThisCycle.has(a.accuserName)) {
            const deadPlayer = up.find((p) => p.name === a.accuserName);
            return { ...a, accuserDiedSameCycle: true, accuserRole: deadPlayer?.role };
          }
          return a;
        })
      );
    }

    const v = checkWin(up, lovers);
    if (v) {
      endGame(v, up, cycle);
      return;
    }
    goNext(up, historyEntry); // A6: pass entry directly to avoid stale state
  }

  // ── TRANSITIONS ───────────────────────────────────────────────────────────

  function goNext(ps: Player[], currentEntry?: HistoryEntry) {
    round2Guard.current = false; // Reset for next cycle
    // A6: Use passed entry directly to avoid stale React state
    const aliveCount = ps.filter((p) => p.alive).length;
    const entry = currentEntry || history[history.length - 1];
    if (entry) {
      let summary = `📋 Bilan jour ${cycle}: `;
      if (entry.nightDeaths && entry.nightDeaths.length > 0) {
        summary += `nuit → ${entry.nightDeaths.join(", ")}. `;
      } else if (entry.nightDeath) {
        summary += `nuit → ${entry.nightDeath}. `;
      }
      if (entry.voteDeath) summary += `vote → ${entry.voteDeath} (${entry.voteRole}). `;
      else summary += `vote → égalité. `;
      summary += `Restent ${aliveCount} joueurs.`;
      addMsg(summary, true, { cycle });
    }

    setVReveals([]);
    setHVote(null);
    setNResult(null);
    const nc = cycle + 1;
    setCycle(nc);
    addMsg(`── Nuit ${nc} ──`, true, { isCycleSep: true, cycle: nc });
    runNight(ps, nc);
  }

  async function endGame(result: "village" | "loups" | "couple", ps: Player[], cy: number) {
    setWinner(result);
    setPhase("gameOver");
    const fallback = result === "village"
      ? "🎉 Le dernier loup tombe. Le village respire."
      : result === "couple"
      ? "💕 Les Amoureux sont les derniers debout. Ils ont éliminé tout le monde ensemble."
      : "🐺 Les ombres se referment. Le village est tombé.";
    const narration = await callNarrator("gameOver", cy, ps,
      { winner: result }, fallback);
    setGameOverNarration(narration);
    addMsg(narration, true, { isVictory: result === "village" || result === "couple", cycle: cy });

    // Log game cost
    try { await fetch("/api/game-stats"); } catch { /* ignore */ }
  }

  // ── HUMAN ACTIONS ─────────────────────────────────────────────────────────

  function submitHuman() {
    if (!input.trim()) return;
    if (!human) return;
    addMsg(input.trim(), false, {
      speaker: human.name, isHuman: true, emoji: human.emoji, color: human.color, cycle,
    });
    setInput("");
    setPhase("debate");
    setIdx((i) => i + 1);
    setSpeaker(null);
  }

  function passHuman() {
    if (!human) return;
    addMsg("...", false, {
      speaker: human.name, isHuman: true, emoji: human.emoji, color: human.color, cycle,
    });
    setPhase("debate");
    setIdx((i) => i + 1);
    setSpeaker(null);
  }

  const round2Guard = useRef(false);
  async function startRound2() {
    // A6: Guard against double execution
    if (round2Guard.current) return;
    round2Guard.current = true;
    // Build a quick summary of round 1 for the narrator
    const round1Msgs = messages.filter((m) => m.cycle === cycle && !m.isSystem && m.speaker);
    const mentioned = new Map<string, number>();
    round1Msgs.forEach((m) => {
      const text = m.text.toLowerCase();
      players.filter((p) => p.alive && p.name !== m.speaker).forEach((p) => {
        if (text.includes(p.name.toLowerCase())) {
          mentioned.set(p.name, (mentioned.get(p.name) || 0) + 1);
        }
      });
    });
    const mostMentioned = [...mentioned.entries()].sort((a, b) => b[1] - a[1]);
    const summary = mostMentioned.length
      ? `${mostMentioned[0][0]} a été le plus mentionné (${mostMentioned[0][1]} fois). ${round1Msgs.length} prises de parole au total.`
      : "Le débat a été calme.";

    const narration = await callNarrator("round2", cycle, players,
      { debateSummary: summary }, "Dernier tour de parole...");
    addMsg(narration, true, { cycle });

    // Compute speakers/skippers for round 2 — previous skippers from round 1
    const alivePs = players.filter((p) => p.alive);
    const { speakers, skippers } = selectSpeakers(alivePs, 2, roundSkippers, messages, cycle, corbeauTarget);
    setPreviousSkippers(roundSkippers); // Save round 1 skippers
    setRoundSpeakers(speakers);
    setRoundSkippers(skippers);
    const aiNames = alivePs.filter((p) => !p.isHuman).map((p) => p.name);
    setDirectives(assignDirectives(aiNames));

    // B5: Accused players speak first in round 2 (right of reply)
    const allAliveNames = alivePs.map((p) => p.name);
    const accused = mostMentioned.filter(([name]) => alivePs.some((p) => p.name === name && p.alive));
    const accusedNames = accused.slice(0, 3).map(([name]) => name);
    const rest = allAliveNames.filter((n) => !accusedNames.includes(n));
    const newOrder = [...accusedNames, ...shuffle(rest)];
    if (accusedNames.length > 0) {
      addMsg(`📢 Droit de réponse : ${accusedNames.join(", ")} parle${accusedNames.length > 1 ? "nt" : ""} en premier.`, true, { cycle });
    }

    setOrder(newOrder);
    setIdx(0);
    setRound(2);
    setPhase("debate");
  }

  function startGame(config: GameConfig) {
    // Reset token stats for new game
    fetch("/api/game-stats", { method: "DELETE" }).catch(() => {});
    const ps = getInitialPlayers(config);
    setPlayers(ps);
    setPhase("intro");
    setHAlive(true);
    setByokKey(config.byokKey || null);
    setByokError(null);
  }

  function launchFromIntro() {
    setCycle(1);
    addMsg("── Nuit 1 ──", true, { isCycleSep: true, cycle: 1 });
    runNight(players, 1);
  }

  function restart() {
    setPlayers([]);
    setPhase("config");
    setCycle(0);
    setRound(1);
    setMessages([]);
    setOrder([]);
    setIdx(0);
    setSpeaker(null);
    setLoading(false);
    setInput("");
    setHVote(null);
    setNResult(null);
    setPotions({ heal: true, poison: true });
    setSeerLog([]);
    setHistory([]);
    setNotableAccusations([]);
    setWinner(null);
    setNText("");
    setVReveals([]);
    setHAlive(true);
    setLovers(null);
    setOverlay(null);
    setGameOverNarration("");
    setSalvateurLastTarget(null);
    setCorbeauTarget(null);
    setHumanNightAction(null);
    setNightData(null);
    setDirectives(new Map());
    setRoundSpeakers(new Set());
    setRoundSkippers(new Set());
    setPreviousSkippers(new Set());
    setLoveChatInput("");
    setLoveChatDone(false);
    setWaitingForNext(false);
    setDeathReveal(null);
    deathRevealResolveRef.current = null;
    loveChatResolveRef.current = null;
    nextResolveRef.current = null;
    if (skipTimerRef.current) { clearTimeout(skipTimerRef.current); skipTimerRef.current = null; }
    busy.current = false;
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  const aliveN = players.filter((p) => p.alive).length;
  const totalN = players.length;
  const phaseLabel: Record<Phase, string> = {
    config: "—",
    intro: "—",
    night: "🌙 Nuit",
    dawn: "☀️ Aube",
    debate: "💬 Débat",
    humanTurn: "✨ Ton tour",
    roundTransition: "⏳",
    voteHuman: "🗳️ Vote",
    voteAI: "🗳️ Vote",
    voteAuto: "🗳️ Vote",
    humanNight: "🌙 Ton action",
    hunterShot: "🎯 Tir du Chasseur",
    loveChat: "💘 Chat Amoureux",
    gameOver: winner === "village" || winner === "couple" ? "🎉 Victoire" : "💀 Défaite",
  };

  const bg =
    phase === "night" || phase === "humanNight" || phase === "loveChat"
      ? "linear-gradient(170deg,#03030f,#08082a,#0a0820)"
      : phase === "gameOver" && winner === "loups"
      ? "linear-gradient(170deg,#1a0505,#250808,#1a0505)"
      : "linear-gradient(170deg,#0f0a1a,#1a0f2e,#1e1232)";

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ background: bg, transition: "background 2s ease" }}
    >
      <header className="relative text-center py-2.5 border-b border-white/8">
        <h1 className="font-display text-xl sm:text-2xl tracking-widest" style={{ color: "#d4a843" }}>
          🐺 LYCANA
        </h1>
        {phase !== "config" && (
          <button
            onClick={() => setShowTuto(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors text-xs"
            title="Comment jouer ?"
          >
            ?
          </button>
        )}
      </header>

      <TutoModal open={showTuto} onClose={() => setShowTuto(false)} />

      {overlay && <PhaseOverlay text={overlay.text} type={overlay.type} onDone={handleOverlayDone} />}
      {deathReveal && (
        <DeathReveal
          player={deathReveal.player}
          cause={deathReveal.cause}
          causeIcon={deathReveal.causeIcon}
          onDone={handleDeathRevealDone}
        />
      )}
      {phase === "gameOver" && winner && (
        <GameOverScreen
          winner={winner}
          players={players}
          narration={gameOverNarration}
          cycle={cycle}
          onRestart={restart}
        />
      )}

      {phase === "config" ? (
        <ConfigScreen onStart={startGame} onShowTuto={() => setShowTuto(true)} />
      ) : (
        <>
          <PlayerBar players={players} speaker={speaker} loading={loading} />

          {phase !== "intro" && (
            <div className="flex items-center justify-center gap-3 py-1.5 bg-white/3 border-b border-white/5 text-xs flex-wrap px-2">
              {hAlive ? (
                <span>
                  <span className="text-gray-500">Rôle </span>
                  <span className="text-yellow-400 font-bold">{humanRole}</span>
                </span>
              ) : (
                <span className="text-red-400 font-bold">💀 Spectateur</span>
              )}
              {/* B1 — Wolf pack indicator */}
              {hAlive && human && isWolfRole(human.role) && (() => {
                const packMates = players.filter((p) => isWolfRole(p.role) && !p.isHuman && p.alive);
                return packMates.length > 0 ? (
                  <>
                    <span className="text-white/10">|</span>
                    <span className="text-red-400">
                      🐺 {packMates.map((p) => p.name).join(", ")}
                    </span>
                  </>
                ) : null;
              })()}
              {/* B0b — Lover indicator */}
              {hAlive && human && lovers && (human.name === lovers.player1 || human.name === lovers.player2) && (() => {
                const partnerName = human.name === lovers.player1 ? lovers.player2 : lovers.player1;
                return (
                  <>
                    <span className="text-white/10">|</span>
                    <span className="text-pink-400">
                      💘 Amoureux{isFeminine(human.name, players) ? "se" : ""} de {partnerName}
                    </span>
                  </>
                );
              })()}
              <span className="text-white/10">|</span>
              <span className="text-gray-500">
                {phase === "night" || phase === "humanNight" || phase === "loveChat"
                  ? <><span className="text-blue-400">Nuit</span> <span className="text-purple-400 font-bold">{cycle}</span></>
                  : <><span className="text-yellow-400">Jour</span> <span className="text-purple-400 font-bold">{cycle}</span></>}
              </span>
              <span className="text-white/10">|</span>
              <span className="text-gray-500">{phaseLabel[phase]}</span>
              <span className="text-white/10">|</span>
              <span className="text-green-400 font-bold">{aliveN}/{totalN}</span>
              {/* D3 — Known dead wolves count */}
              {(() => {
                const deadWolves = players.filter((p) => !p.alive && p.revealedRole && isWolfRole(p.role));
                const totalWolves = players.filter((p) => isWolfRole(p.role)).length;
                return deadWolves.length > 0 ? (
                  <>
                    <span className="text-white/10">|</span>
                    <span className="text-red-400">🐺 {deadWolves.length}/{totalWolves}</span>
                  </>
                ) : null;
              })()}
              {byokKey && (
                <>
                  <span className="text-white/10">|</span>
                  <span className="text-amber-400/80">🔑 Clé perso</span>
                </>
              )}
            </div>
          )}

          {byokError && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-red-900/40 border-b border-red-700/30 text-xs text-red-300">
              <span>🔑 {byokError}</span>
              <button
                onClick={() => setByokError(null)}
                className="text-red-400 hover:text-red-200 transition-colors font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            {phase === "intro" ? (
              <RoleRevealCeremony
                role={humanRole as any}
                roleEmoji={roleEmoji(humanRole as any)}
                players={players}
                onComplete={launchFromIntro}
              />
            ) : (
              <>
                <ChatFeed
                  messages={messages} nText={nText} loading={loading}
                  speaker={speaker} players={players} vReveals={vReveals}
                  phase={phase} winner={winner}
                />
                <InputArea
                  phase={phase} round={round} cycle={cycle} input={input} setInput={setInput}
                  speaker={speaker} loading={loading} hVote={hVote}
                  players={players} winner={winner}
                  humanRole={humanRole}
                  potions={potions}
                  nightData={nightData}
                  seerLog={seerLog}
                  salvateurLastTarget={salvateurLastTarget}
                  waitingForNext={waitingForNext}
                  onNext={handleNext}
                  onSubmit={submitHuman}
                  onPass={passHuman}
                  onVote={(name) => { setHVote(name); setPhase("voteAI"); }}
                  onBlankVote={() => { setHVote("abstention"); setPhase("voteAI"); }}
                  onRound2={startRound2}
                  onRestart={restart}
                  onNightAction={continueNight}
                  onHunterShot={handleHunterShot}
                  lovers={lovers}
                  loveChatInput={loveChatInput}
                  setLoveChatInput={setLoveChatInput}
                  onLoveChatSubmit={handleLoveChatSubmit}
                  onLoveChatSkip={handleLoveChatSkip}
                  apiHeaders={apiHeaders}
                />
              </>
            )}
          </div>
        </>
      )}
      {debugMode && phase !== "config" && (
        <DebugPanel
          players={players}
          messages={messages}
          cycle={cycle}
          nightData={nightData}
          seerLog={seerLog}
          lovers={lovers}
          corbeauTarget={corbeauTarget}
          directives={directives}
          wolfReason={nightData?.wolfReason}
        />
      )}
    </div>
  );
}
