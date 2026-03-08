"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { Phase, Player, Role, Potions, SeerEntry, NightResponse, Lovers } from "@/types/game";
import { isWolfRole, isFeminine } from "@/lib/game-engine";

interface InputAreaProps {
  phase: Phase;
  round: number;
  cycle: number;
  input: string;
  setInput: (v: string) => void;
  speaker: string | null;
  loading: boolean;
  hVote: string | null;
  players: Player[];
  winner: "village" | "loups" | "couple" | null;
  humanRole: string;
  potions: Potions;
  nightData: NightResponse | null;
  seerLog: SeerEntry[];
  salvateurLastTarget: string | null;
  waitingForNext: boolean;
  onNext: () => void;
  onSubmit: () => void;
  onPass: () => void;
  onVote: (name: string) => void;
  onBlankVote: () => void;
  onRound2: () => void;
  onRestart: () => void;
  onNightAction: (action: string) => void;
  onHunterShot: (target: string) => void;
  lovers?: Lovers | null;
  loveChatInput?: string;
  setLoveChatInput?: (v: string) => void;
  onLoveChatSubmit?: (message: string) => void;
  onLoveChatSkip?: () => void;
  apiHeaders?: () => Record<string, string>;
}

export default function InputArea({
  phase, round, cycle, input, setInput, speaker, loading, hVote,
  players, winner, humanRole, potions, nightData, seerLog,
  salvateurLastTarget, waitingForNext, onNext,
  onSubmit, onPass, onVote, onBlankVote, onRound2, onRestart,
  onNightAction, onHunterShot,
  lovers, loveChatInput, setLoveChatInput, onLoveChatSubmit, onLoveChatSkip,
  apiHeaders,
}: InputAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (phase === "humanTurn" && inputRef.current) {
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  // B1: Keyboard handler for Suivant (Space/Enter when waiting)
  useEffect(() => {
    if (!waitingForNext) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        // Don't intercept if user is typing in an input field
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [waitingForNext, onNext]);

  const suggestions = getSuggestions(round, players);
  const human = players.find((p) => p.isHuman);

  return (
    <div className={`border-t border-white/8 p-3 bg-black/20 ${
      phase === "humanTurn" || phase === "voteHuman" || phase === "hunterShot" ? "glow-pulse" : ""
    }`}>
      {/* Human debate turn */}
      {phase === "humanTurn" && (
        <div>
          <p className="text-yellow-400 text-xs mb-2 font-bold uppercase tracking-wider">
            💬 Ton tour — Tour {round}/2
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="Accuse, défends, questionne..."
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-700/50"
            />
            <button
              onClick={onSubmit}
              disabled={!input.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-20 hover:scale-105 active:scale-95 transition-all"
              style={{
                background: input.trim() ? "linear-gradient(135deg,#d4a843,#b8892e)" : "#222",
                color: "#1a0f2e",
              }}
            >
              Parler
            </button>
            <button onClick={onPass} className="px-3 py-2.5 rounded-xl text-xs text-gray-500 bg-white/5 border border-white/10 hover:bg-white/10" title="Passer">
              Passer
            </button>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => setInput(s)}
                className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-colors truncate max-w-xs">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Human night action */}
      {phase === "humanNight" && human && (
        <HumanNightPanel
          human={human}
          players={players}
          potions={potions}
          nightData={nightData}
          seerLog={seerLog}
          salvateurLastTarget={salvateurLastTarget}
          onAction={onNightAction}
          cycle={cycle}
          lovers={lovers}
          apiHeaders={apiHeaders}
        />
      )}

      {/* Hunter shot */}
      {phase === "hunterShot" && (
        <div>
          <p className="text-red-400 text-xs mb-2 font-bold uppercase tracking-wider">
            🎯 Tu es mort ! Qui emportes-tu ?
          </p>
          <div className="flex gap-2 flex-wrap">
            {players
              .filter((p) => p.alive && !p.isHuman)
              .map((p) => (
                <button key={p.name} onClick={() => onHunterShot(p.name)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-red-900/25 hover:border-red-700/30 transition-all hover:scale-105 active:scale-95"
                  style={{ color: p.color }}>
                  {p.emoji} {p.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {phase === "roundTransition" && (
        <div className="text-center py-2">
          <p className="text-purple-300 text-sm mb-2">Premier tour terminé.</p>
          <button onClick={onRound2}
            className="px-6 py-2.5 rounded-xl font-display text-sm tracking-widest hover:scale-105 transition-all"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6D28D9)", color: "white" }}>
            DERNIER MOT
          </button>
        </div>
      )}

      {phase === "voteHuman" && hVote === null && (
        <div>
          <p className="text-red-400 text-xs mb-2 font-bold uppercase tracking-wider">
            🗳️ Qui éliminer ?
          </p>
          <div className="flex gap-2 flex-wrap">
            {players
              .filter((p) => p.alive && !p.isHuman)
              .map((p) => (
                <button key={p.name} onClick={() => onVote(p.name)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-red-900/25 hover:border-red-700/30 transition-all hover:scale-105 active:scale-95"
                  style={{ color: p.color }}>
                  {p.emoji} {p.name}
                </button>
              ))}
            {/* D4 — Blank vote */}
            <button onClick={onBlankVote}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-500 hover:bg-white/10 hover:text-gray-300 transition-all">
              Vote blanc
            </button>
          </div>
        </div>
      )}

      {/* B0d — Love chat */}
      {phase === "loveChat" && human && lovers && onLoveChatSubmit && onLoveChatSkip && setLoveChatInput && (
        (() => {
          const partnerName = human.name === lovers.player1 ? lovers.player2 : lovers.player1;
          const partner = players.find((p) => p.name === partnerName);
          return (
            <div>
              <p className="text-pink-400 text-xs mb-1 font-bold uppercase tracking-wider">
                💘 Chat Amoureux — Nuit
              </p>
              <p className="text-pink-300/60 text-xs mb-2">
                Murmure quelque chose à {partner?.emoji} {partnerName}... (Tu peux révéler ton rôle ou pas)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={loveChatInput || ""}
                  onChange={(e) => setLoveChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loveChatInput?.trim() && onLoveChatSubmit(loveChatInput.trim())}
                  placeholder="Chuchote à ton amour..."
                  className="flex-1 bg-pink-950/40 border border-pink-800/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-pink-400/40 focus:outline-none focus:border-pink-600/50"
                />
                <button
                  onClick={() => loveChatInput?.trim() && onLoveChatSubmit(loveChatInput.trim())}
                  disabled={!loveChatInput?.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-20 hover:scale-105 active:scale-95 transition-all"
                  style={{
                    background: loveChatInput?.trim() ? "linear-gradient(135deg,#ec4899,#db2777)" : "#222",
                    color: "white",
                  }}
                >
                  💘
                </button>
                <button
                  onClick={onLoveChatSkip}
                  className="px-3 py-2.5 rounded-xl text-xs text-gray-500 bg-white/5 border border-white/10 hover:bg-white/10"
                  title="Passer"
                >
                  Passer
                </button>
              </div>
            </div>
          );
        })()
      )}

      {/* B1: Suivant button — replaces speed controls */}
      {["debate", "night", "dawn", "voteAI", "voteAuto"].includes(phase) && phase !== "humanTurn" && (
        <div className="flex items-center justify-center py-1.5 px-2">
          {waitingForNext ? (
            <button
              onClick={onNext}
              className="px-5 py-2 rounded-xl text-sm font-display tracking-wider hover:scale-105 active:scale-95 transition-all animate-fade-in"
              style={{
                background: "linear-gradient(135deg, rgba(212,168,67,0.2), rgba(212,168,67,0.1))",
                border: "1px solid rgba(212,168,67,0.3)",
                color: "#d4a843",
              }}
            >
              SUIVANT ▶
            </button>
          ) : (
            <p className="text-gray-500 text-xs text-center">
              {phase === "night" ? "Le village dort..." :
               phase === "dawn" ? "L'aube se lève..." :
               phase === "voteAI" || phase === "voteAuto" ? "Votes en cours..." :
               speaker ? speaker + " parle..." : "..."}
            </p>
          )}
        </div>
      )}

      {phase === "gameOver" && (
        <div className="text-center py-2">
          <button onClick={onRestart}
            className="px-6 py-2.5 rounded-xl font-display text-sm tracking-widest hover:scale-105 transition-all shadow-lg"
            style={{ background: "linear-gradient(135deg,#d4a843,#b8892e)", color: "#1a0f2e" }}>
            REJOUER
          </button>
        </div>
      )}
    </div>
  );
}

// ── HUMAN NIGHT PANEL ─────────────────────────────────────────────────────

function HumanNightPanel({
  human, players, potions, nightData, seerLog, salvateurLastTarget, onAction, cycle, lovers, apiHeaders,
}: {
  human: Player;
  players: Player[];
  potions: Potions;
  nightData: NightResponse | null;
  seerLog: SeerEntry[];
  salvateurLastTarget: string | null;
  onAction: (action: string) => void;
  cycle: number;
  lovers?: Lovers | null;
  apiHeaders?: () => Record<string, string>;
}) {
  const [cupidonPick1, setCupidonPick1] = useState<string | null>(null);

  switch (human.role) {
    case "Loup-Garou":
    case "Loup Alpha": {
      const partners = players.filter((p) => isWolfRole(p.role) && !p.isHuman && p.alive);
      const targets = players.filter((p) => p.alive && !isWolfRole(p.role));
      const canConvert = human.role === "Loup Alpha" && !human.alphaUsed;
      const wolfSuggestion = nightData?.wolfTarget || null;
      const wolfReason = nightData?.wolfReason || null;
      return (
        <AlphaWolfPanel
          partners={partners}
          targets={targets}
          canConvert={canConvert}
          wolfSuggestion={wolfSuggestion}
          wolfReason={wolfReason}
          onAction={onAction}
          players={players}
          cycle={cycle}
          lovers={lovers}
          apiHeaders={apiHeaders}
        />
      );
    }

    case "Voyante": {
      const inspected = seerLog.map((s) => s.target);
      const candidates = players.filter(
        (p) => p.alive && !p.isHuman && !inspected.includes(p.name)
      );
      const fallback = candidates.length === 0
        ? players.filter((p) => p.alive && !p.isHuman)
        : candidates;
      return (
        <div>
          <p className="text-purple-400 text-xs mb-1 font-bold uppercase tracking-wider">
            🔮 Nuit — Qui inspecter ?
          </p>
          {seerLog.length > 0 && (
            <p className="text-purple-300/60 text-xs mb-2">
              Déjà vu : {seerLog.map((s) => `${s.target} (${s.result})`).join(", ")}
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            {fallback.map((p) => (
              <button key={p.name} onClick={() => onAction(p.name)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/30 border border-purple-800/20 text-sm hover:bg-purple-900/40 transition-all"
                style={{ color: p.color }}>
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "Sorcière": {
      const wolfTarget = nightData?.wolfTarget;
      return (
        <div>
          <p className="text-green-400 text-xs mb-1 font-bold uppercase tracking-wider">
            🧪 Nuit — Action de la Sorcière
          </p>
          {wolfTarget && (
            <p className="text-green-300/60 text-xs mb-2">
              Les loups ciblent : <span className="text-red-300 font-bold">{wolfTarget}</span>
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            {potions.heal && wolfTarget && (
              <button onClick={() => onAction("SAUVER")}
                className="px-4 py-2 rounded-xl bg-green-950/30 border border-green-800/20 text-sm text-green-300 hover:bg-green-900/40 transition-all">
                💚 Sauver {wolfTarget}
              </button>
            )}
            {potions.poison && (
              <>
                {players
                  .filter((p) => p.alive && !p.isHuman)
                  .map((p) => (
                    <button key={p.name} onClick={() => onAction(`EMPOISONNER ${p.name}`)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-950/30 border border-purple-800/20 text-xs text-purple-300 hover:bg-purple-900/40 transition-all">
                      ☠️ {p.name}
                    </button>
                  ))}
              </>
            )}
            <button onClick={() => onAction("RIEN")}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:bg-white/10 transition-all">
              Ne rien faire
            </button>
          </div>
        </div>
      );
    }

    case "Salvateur": {
      const candidates = players.filter(
        (p) => p.alive && p.name !== salvateurLastTarget
      );
      return (
        <div>
          <p className="text-blue-400 text-xs mb-1 font-bold uppercase tracking-wider">
            🔒 Nuit — Qui protéger ?
          </p>
          {salvateurLastTarget && (
            <p className="text-blue-300/60 text-xs mb-2">
              Interdit : {salvateurLastTarget} (protégé la nuit dernière)
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            {candidates.map((p) => (
              <button key={p.name} onClick={() => onAction(p.name)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-950/30 border border-blue-800/20 text-sm hover:bg-blue-900/40 transition-all"
                style={{ color: p.color }}>
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "Cupidon": {
      const candidates = players.filter((p) => p.alive && !p.isHuman);
      if (!cupidonPick1) {
        return (
          <div>
            <p className="text-pink-400 text-xs mb-1 font-bold uppercase tracking-wider">
              💘 Nuit — Premier Amoureux
            </p>
            <p className="text-pink-300/60 text-xs mb-2">Choisis le premier joueur du couple</p>
            <div className="flex gap-2 flex-wrap">
              {candidates.map((p) => (
                <button key={p.name} onClick={() => setCupidonPick1(p.name)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-950/30 border border-pink-800/20 text-sm hover:bg-pink-900/40 transition-all"
                  style={{ color: p.color }}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div>
          <p className="text-pink-400 text-xs mb-1 font-bold uppercase tracking-wider">
            💘 Nuit — Deuxième Amoureux
          </p>
          <p className="text-pink-300/60 text-xs mb-2">
            Premier choix : <span className="text-pink-300 font-bold">{cupidonPick1}</span>
          </p>
          <div className="flex gap-2 flex-wrap">
            {candidates
              .filter((p) => p.name !== cupidonPick1)
              .map((p) => (
                <button key={p.name} onClick={() => {
                  onAction(`${cupidonPick1},${p.name}`);
                  setCupidonPick1(null);
                }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-950/30 border border-pink-800/20 text-sm hover:bg-pink-900/40 transition-all"
                  style={{ color: p.color }}>
                  {p.emoji} {p.name}
                </button>
              ))}
          </div>
        </div>
      );
    }

    case "Corbeau": {
      const targets = players.filter((p) => p.alive && !p.isHuman);
      return (
        <div>
          <p className="text-gray-400 text-xs mb-1 font-bold uppercase tracking-wider">
            🐦 Nuit — Qui accuser ? (+2 voix demain)
          </p>
          <div className="flex gap-2 flex-wrap">
            {targets.map((p) => (
              <button key={p.name} onClick={() => onAction(p.name)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900/30 border border-gray-700/20 text-sm hover:bg-gray-800/40 transition-all"
                style={{ color: p.color }}>
                {p.emoji} {p.name}
              </button>
            ))}
            <button onClick={() => onAction("PERSONNE")}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:bg-white/10 transition-all">
              Personne
            </button>
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="text-center py-1">
          <p className="text-gray-500 text-xs">Le village dort...</p>
        </div>
      );
  }
}

// ── ALPHA WOLF PANEL (A1: interactive chat) ─────────────────────────────

function AlphaWolfPanel({
  partners, targets, canConvert, wolfSuggestion, wolfReason, onAction, players, cycle, lovers, apiHeaders,
}: {
  partners: Player[];
  targets: Player[];
  canConvert: boolean;
  wolfSuggestion: string | null;
  wolfReason?: string | null;
  onAction: (action: string) => void;
  players: Player[];
  cycle: number;
  lovers?: Lovers | null;
  apiHeaders?: () => Record<string, string>;
}) {
  const [mode, setMode] = useState<"chat" | "devour" | "convert">("chat");
  const [chatMessages, setChatMessages] = useState<{ speaker: string; text: string; isHuman?: boolean }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_EXCHANGES = 2;

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  // Focus input
  useEffect(() => {
    if (mode === "chat" && inputRef.current) inputRef.current.focus();
  }, [mode, chatMessages]);

  // Show AI suggestion as first message
  useEffect(() => {
    if (wolfSuggestion && partners.length > 0 && chatMessages.length === 0) {
      const mainPartner = partners[0];
      let text = `Je propose ${wolfSuggestion}.`;
      if (wolfReason) text += ` ${wolfReason}`;
      setChatMessages([{ speaker: mainPartner.name, text }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");

    const human = players.find((p) => p.isHuman);
    const humanName = human?.name || "Toi";

    // Add human message
    const newHistory = [...chatMessages, { speaker: humanName, text: msg, isHuman: true }];
    setChatMessages(newHistory);

    if (exchangeCount >= MAX_EXCHANGES - 1) {
      // Last exchange — no more AI response, go straight to target selection
      setExchangeCount(MAX_EXCHANGES);
      return;
    }

    // Get AI wolf response
    if (partners.length > 0) {
      setChatLoading(true);
      try {
        const wolf = partners[0];
        const res = await fetch("/api/wolf-chat", {
          method: "POST",
          headers: apiHeaders ? apiHeaders() : { "Content-Type": "application/json" },
          body: JSON.stringify({
            wolf, players, cycle, humanMessage: msg,
            chatHistory: newHistory.map((m) => ({ speaker: m.speaker, text: m.text })),
            lovers,
          }),
        });
        const data = await res.json();
        setChatMessages((prev) => [...prev, { speaker: wolf.name, text: data.text }]);
      } catch {
        setChatMessages((prev) => [...prev, { speaker: partners[0].name, text: "..." }]);
      }
      setChatLoading(false);
    }

    setExchangeCount((c) => c + 1);
  }, [chatInput, chatLoading, chatMessages, exchangeCount, partners, players, cycle]);

  const goToSelect = (selectMode: "devour" | "convert") => setMode(selectMode);

  // Chat mode
  if (mode === "chat") {
    const chatDone = exchangeCount >= MAX_EXCHANGES || partners.length === 0;
    return (
      <div>
        <p className="text-red-400 text-xs mb-1 font-bold uppercase tracking-wider">
          🐺 Nuit — Conseil des Loups
        </p>
        {partners.length > 0 && (
          <p className="text-red-300/60 text-xs mb-1">
            Coéquipier(s) : {partners.map((p) => `${p.emoji} ${p.name}`).join(", ")}
          </p>
        )}

        {/* Chat messages */}
        {chatMessages.length > 0 && (
          <div ref={chatRef} className="max-h-28 overflow-y-auto mb-2 space-y-1 px-1">
            {chatMessages.map((m, i) => (
              <div key={i} className={`text-xs ${m.isHuman ? "text-right" : ""}`}>
                <span className={m.isHuman ? "text-yellow-300" : "text-red-300"}>
                  {m.speaker}:
                </span>{" "}
                <span className="text-gray-300">{m.text}</span>
              </div>
            ))}
            {chatLoading && (
              <div className="text-xs text-red-400/50 italic">réfléchit...</div>
            )}
          </div>
        )}

        {/* Chat input or proceed to target */}
        {!chatDone ? (
          <div className="flex gap-2 mb-2">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Discute avec la meute..."
              className="flex-1 bg-red-950/30 border border-red-800/20 rounded-xl px-3 py-2 text-sm text-white placeholder-red-400/40 focus:outline-none focus:border-red-600/50"
              disabled={chatLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!chatInput.trim() || chatLoading}
              className="px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-20 hover:scale-105 active:scale-95 transition-all"
              style={{
                background: chatInput.trim() ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "#222",
                color: "white",
              }}
            >
              🐺
            </button>
          </div>
        ) : (
          <p className="text-red-300/60 text-xs mb-2 italic">
            {partners.length === 0 ? "Tu es seul. Choisis ta cible." : "Discussion terminée. Choisis ta cible."}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={() => goToSelect("devour")}
            className="px-4 py-2 rounded-xl bg-red-950/40 border border-red-800/30 text-sm text-red-300 hover:bg-red-900/50 transition-all font-bold">
            🐺 Dévorer
          </button>
          {canConvert && (
            <button onClick={() => goToSelect("convert")}
              className="px-4 py-2 rounded-xl bg-purple-950/40 border border-purple-800/30 text-sm text-purple-300 hover:bg-purple-900/50 transition-all font-bold">
              🔄 Convertir
            </button>
          )}
          {!chatDone && partners.length > 0 && (
            <button onClick={() => setExchangeCount(MAX_EXCHANGES)}
              className="px-3 py-2 rounded-xl text-xs text-gray-500 bg-white/5 border border-white/10 hover:bg-white/10">
              Passer le chat
            </button>
          )}
        </div>
      </div>
    );
  }

  // Target selection mode (devour/convert)
  return (
    <div>
      <p className="text-red-400 text-xs mb-1 font-bold uppercase tracking-wider">
        {mode === "convert" ? "🔄 Nuit — Qui convertir ?" : "🐺 Nuit — Qui dévorer ?"}
      </p>
      <button onClick={() => setMode("chat")}
        className="text-xs text-gray-400 underline mb-2 inline-block hover:text-gray-200">
        ← Retour au chat
      </button>
      <div className="flex gap-2 flex-wrap">
        {targets.map((p) => (
          <button key={p.name} onClick={() => onAction(mode === "convert" ? `CONVERT:${p.name}` : p.name)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all ${
              mode === "convert"
                ? "bg-purple-950/30 border-purple-800/20 hover:bg-purple-900/40"
                : "bg-red-950/30 border-red-800/20 hover:bg-red-900/40"
            }`}
            style={{ color: p.color }}>
            {p.emoji} {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function getSuggestions(round: number, players: Player[]): string[] {
  const ai = players.filter((p) => p.alive && !p.isHuman).map((p) => p.name);
  const r1 = ai[Math.floor(Math.random() * ai.length)] || "?";
  const r2 = ai.filter((n) => n !== r1)[Math.floor(Math.random() * Math.max(ai.length - 1, 1))] || "?";

  if (round === 1) {
    return [
      "Quelqu'un a un doute ?",
      `${r1}, t'es bien tranquille.`,
      "On devrait écouter tout le monde.",
      `Y'a un truc bizarre chez ${r2}.`,
    ];
  }
  return [
    `Je maintiens sur ${r1}.`,
    "Y'a un loup dans le consensus.",
    `${r2}, explique-toi.`,
    "Si on se trompe, on est morts demain.",
  ];
}
