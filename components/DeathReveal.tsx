"use client";

import { useState, useEffect, useCallback } from "react";
import type { Player, Role } from "@/types/game";
import { isWolfRole } from "@/lib/game-engine";
import { roleEmoji } from "@/lib/game-engine";

interface DeathRevealProps {
  player: Player;
  cause: string; // e.g. "Dévoré par les loups", "Éliminé par le village"
  causeIcon: string; // e.g. "🐺", "🗳️", "💔"
  onDone: () => void;
}

const CAUSE_THEMES: Record<string, { bg: string; accentColor: string; glowColor: string }> = {
  wolf: { bg: "linear-gradient(170deg, #1a0505 0%, #250808 50%, #1a0505 100%)", accentColor: "#f87171", glowColor: "rgba(248,113,113,0.2)" },
  vote: { bg: "linear-gradient(170deg, #0f0a1a 0%, #1a0f2e 50%, #0f0a1a 100%)", accentColor: "#c4b5fd", glowColor: "rgba(196,181,253,0.15)" },
  poison: { bg: "linear-gradient(170deg, #0a1a12 0%, #0f2e1a 50%, #0a1a12 100%)", accentColor: "#4ade80", glowColor: "rgba(74,222,128,0.15)" },
  love: { bg: "linear-gradient(170deg, #1a0a18 0%, #2e0f28 50%, #1a0a18 100%)", accentColor: "#f472b6", glowColor: "rgba(244,114,182,0.15)" },
  hunter: { bg: "linear-gradient(170deg, #1a120a 0%, #2e1a0f 50%, #1a120a 100%)", accentColor: "#fb923c", glowColor: "rgba(251,146,60,0.15)" },
  default: { bg: "linear-gradient(170deg, #0a0a0f 0%, #121218 50%, #0a0a0f 100%)", accentColor: "#9ca3af", glowColor: "rgba(156,163,175,0.1)" },
};

function getCauseTheme(causeIcon: string): { bg: string; accentColor: string; glowColor: string } {
  if (causeIcon.includes("🐺")) return CAUSE_THEMES.wolf;
  if (causeIcon.includes("🗳") || causeIcon.includes("⚖")) return CAUSE_THEMES.vote;
  if (causeIcon.includes("🧪") || causeIcon.includes("☠")) return CAUSE_THEMES.poison;
  if (causeIcon.includes("💔") || causeIcon.includes("💘")) return CAUSE_THEMES.love;
  if (causeIcon.includes("🎯")) return CAUSE_THEMES.hunter;
  return CAUSE_THEMES.default;
}

export default function DeathReveal({ player, cause, causeIcon, onDone }: DeathRevealProps) {
  const [stage, setStage] = useState(0);
  // 0: dark screen with cause icon
  // 1: portrait/emoji appears
  // 2: card flips to reveal role
  // 3: cause text + Suivant button

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 800),
      setTimeout(() => setStage(2), 2000),
      setTimeout(() => setStage(3), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const advance = useCallback(() => {
    if (stage >= 3) onDone();
  }, [stage, onDone]);

  // Keyboard: Space/Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && stage >= 3) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, stage]);

  const theme = getCauseTheme(causeIcon);
  const isWolf = isWolfRole(player.role);
  const emoji = roleEmoji(player.role as Role);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: theme.bg, cursor: stage >= 3 ? "pointer" : "default" }}
      onClick={stage >= 3 ? advance : undefined}
    >
      {/* Cause icon */}
      <div
        className="text-4xl sm:text-5xl mb-6"
        style={{
          opacity: stage >= 0 ? 1 : 0,
          transform: stage >= 0 ? "scale(1)" : "scale(0.5)",
          transition: "all 0.6s ease",
        }}
      >
        {causeIcon}
      </div>

      {/* Player portrait card */}
      <div
        className="card-perspective"
        style={{
          width: 180,
          height: 240,
          opacity: stage >= 1 ? 1 : 0,
          transform: stage >= 1 ? "scale(1)" : "scale(0.8)",
          transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          className={`card-inner ${stage >= 2 ? "flipped" : ""}`}
          style={{ width: 180, height: 240, position: "relative" }}
        >
          {/* Card front — player identity (face down = who they were publicly) */}
          <div
            className="card-face rounded-2xl flex flex-col items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #1a1025 0%, #0f0a18 100%)",
              border: `2px solid ${(player.color || "#666")}40`,
              boxShadow: `0 0 30px ${theme.glowColor}, 0 8px 32px rgba(0,0,0,0.5)`,
            }}
          >
            <div className="text-5xl mb-3">{player.emoji}</div>
            <h3
              className="font-display text-base tracking-widest text-center"
              style={{ color: player.color || "#ccc" }}
            >
              {player.name}
            </h3>
            <div
              className="w-10 h-px mt-3 rounded-full"
              style={{ backgroundColor: `${player.color || "#666"}40` }}
            />
          </div>

          {/* Card back — role revealed */}
          <div
            className="card-face card-back-face rounded-2xl flex flex-col items-center justify-center px-4"
            style={{
              background: `linear-gradient(135deg, ${isWolf ? "#1a0505" : "#1a0f2e"} 0%, #050510 100%)`,
              border: `2px solid ${theme.accentColor}40`,
              boxShadow: `0 0 40px ${theme.glowColor}, 0 0 80px ${theme.glowColor}, 0 8px 32px rgba(0,0,0,0.5)`,
            }}
          >
            <div className="text-4xl mb-2">{emoji}</div>
            <h3
              className="font-display text-sm tracking-widest text-center"
              style={{ color: theme.accentColor }}
            >
              {player.role}
            </h3>
            <div
              className="w-10 h-px mt-2 mb-2 rounded-full"
              style={{ backgroundColor: `${theme.accentColor}40` }}
            />
            <p className="text-xs text-center" style={{ color: player.color || "#ccc" }}>
              {player.emoji} {player.name}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {isWolf ? "Camp des Loups" : "Camp du Village"}
            </p>
          </div>
        </div>
      </div>

      {/* Cause text */}
      <div
        className="mt-8 max-w-xs text-center"
        style={{
          opacity: stage >= 3 ? 1 : 0,
          transform: stage >= 3 ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.6s ease",
        }}
      >
        <p className="text-gray-300 text-sm leading-relaxed">{cause}</p>
      </div>

      {/* Suivant button */}
      <div
        className="mt-8"
        style={{
          opacity: stage >= 3 ? 1 : 0,
          transform: stage >= 3 ? "translateY(0)" : "translateY(8px)",
          transition: "all 0.5s ease 0.3s",
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            advance();
          }}
          className="px-6 py-2.5 rounded-xl font-display text-sm tracking-widest hover:scale-105 active:scale-95 transition-all"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          SUIVANT ▶
        </button>
        <p className="text-center text-gray-600 text-xs mt-2">Espace / tap</p>
      </div>
    </div>
  );
}
