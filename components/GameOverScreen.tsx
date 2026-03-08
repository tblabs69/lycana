"use client";

import { useState, useEffect } from "react";
import type { Player } from "@/types/game";
import { isWolfRole } from "@/lib/game-engine";

interface GameOverScreenProps {
  winner: "village" | "loups" | "couple";
  players: Player[];
  narration: string;
  cycle: number;
  onRestart: () => void;
}

const THEME = {
  village: {
    bg: "linear-gradient(170deg, #051a0a 0%, #0a2a10 50%, #051a0a 100%)",
    titleColor: "#4ade80",
    title: "VICTOIRE DU VILLAGE",
    icon: "\u{1F389}",
  },
  couple: {
    bg: "linear-gradient(170deg, #1a0515 0%, #2a0820 50%, #1a0515 100%)",
    titleColor: "#f472b6",
    title: "VICTOIRE DES AMOUREUX",
    icon: "\u{1F495}",
  },
  loups: {
    bg: "linear-gradient(170deg, #1a0505 0%, #2a0808 50%, #1a0505 100%)",
    titleColor: "#f87171",
    title: "LES LOUPS TRIOMPHENT",
    icon: "\u{1F43A}",
  },
};

export default function GameOverScreen({
  winner,
  players,
  narration,
  cycle,
  onRestart,
}: GameOverScreenProps) {
  const [stage, setStage] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);

  const theme = THEME[winner];

  // Sort: alive first (exciting unknown roles), then dead (already known)
  // Within each group: wolves last for surprise
  const sorted = [...players].sort((a, b) => {
    // Alive first
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    // Wolves last within each group
    const aW = isWolfRole(a.role) ? 1 : 0;
    const bW = isWolfRole(b.role) ? 1 : 0;
    return aW - bW;
  });

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 600),
      setTimeout(() => setStage(2), 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Sequential role reveal
  useEffect(() => {
    if (stage < 2) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setRevealedCount(i);
      if (i >= players.length) {
        clearInterval(interval);
        // Show replay button after all roles revealed
        setTimeout(() => setStage(3), 600);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [stage, players.length]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto py-8 sm:py-12 px-4"
      style={{ background: theme.bg }}
    >
      <div className="max-w-md w-full flex flex-col items-center">
        {/* Icon + Title */}
        <div
          className="text-center mb-6"
          style={{
            opacity: stage >= 1 ? 1 : 0,
            transform: stage >= 1 ? "translateY(0) scale(1)" : "translateY(20px) scale(0.8)",
            transition: "all 1s ease",
          }}
        >
          <div className="text-6xl sm:text-7xl mb-4">{theme.icon}</div>
          <h2
            className="font-display text-2xl sm:text-3xl tracking-widest"
            style={{ color: theme.titleColor }}
          >
            {theme.title}
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            Cycle {cycle} &middot; {players.filter((p) => p.alive).length} survivants
          </p>
        </div>

        {/* Narrator text */}
        <div
          className="max-w-sm text-center mb-8 px-2"
          style={{
            opacity: narration ? 1 : 0,
            transform: narration ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.8s ease",
          }}
        >
          <p
            className="font-display text-base sm:text-lg leading-relaxed italic"
            style={{ color: "#d4a843" }}
          >
            {narration || "..."}
          </p>
        </div>

        {/* Role reveal */}
        <div
          className="w-full mb-8"
          style={{
            opacity: stage >= 2 ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        >
          <p className="text-xs text-gray-600 uppercase tracking-widest text-center mb-3">
            Identit&eacute;s r&eacute;v&eacute;l&eacute;es
          </p>
          <div className="space-y-1.5">
            {sorted.map((p, i) => {
              const revealed = i < revealedCount;
              const wolf = isWolfRole(p.role);
              return (
                <div
                  key={p.name}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                  style={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? "translateX(0)" : "translateX(-12px)",
                    transition: "all 0.35s ease",
                    backgroundColor: wolf
                      ? "rgba(239,68,68,0.08)"
                      : "rgba(255,255,255,0.03)",
                    borderColor: wolf
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(255,255,255,0.06)",
                  }}
                >
                  <span className="text-lg flex-shrink-0">
                    {p.alive ? p.emoji : "\u{1F480}"}
                  </span>
                  <span
                    className="flex-1 text-sm font-medium truncate"
                    style={{ color: p.color }}
                  >
                    {p.name}
                    {p.isHuman && (
                      <span className="text-yellow-500 ml-1">&starf;</span>
                    )}
                  </span>
                  <span
                    className={`text-sm flex-shrink-0 ${
                      wolf ? "text-red-400 font-bold" : "text-gray-400"
                    }`}
                  >
                    {p.role === "Loup-Garou"
                      ? "\u{1F43A} Loup"
                      : p.role === "Loup Alpha"
                      ? "\u{1F43A}\u{1F451} Alpha"
                      : p.role}
                  </span>
                  <span
                    className={`text-xs flex-shrink-0 w-10 text-right ${
                      p.alive ? "text-green-500/70" : "text-red-500/40"
                    }`}
                  >
                    {p.alive ? "en vie" : "mort"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Replay button */}
        <div
          className="text-center"
          style={{
            opacity: stage >= 3 ? 1 : 0,
            transform: stage >= 3 ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.6s ease",
          }}
        >
          <button
            onClick={onRestart}
            className="px-10 py-3.5 rounded-xl font-display text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-yellow-900/30"
            style={{
              background: "linear-gradient(135deg, #d4a843, #b8892e)",
              color: "#1a0f2e",
            }}
          >
            REJOUER
          </button>
        </div>
      </div>
    </div>
  );
}
