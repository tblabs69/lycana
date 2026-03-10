"use client";

import { useEffect, useCallback } from "react";
import type { Player, DeathCause } from "@/types/game";
import { PERSONALITY_TRAITS } from "@/lib/prompts";
import { PERSONALITY_DESCRIPTIONS } from "@/lib/prompts";
import { isWolfRole } from "@/lib/game-engine";

interface PlayerProfileDrawerProps {
  player: Player | null;
  onClose: () => void;
}

const TRAIT_LABELS = ["Suspicion", "Agressivité", "Fidélité", "Bavardage", "Honnêteté", "Courage"];

function traitColor(value: number): string {
  if (value <= 3) return "#ef4444"; // red
  if (value <= 6) return "#eab308"; // yellow
  return "#22c55e"; // green
}

function traitBarBg(value: number): string {
  if (value <= 3) return "rgba(239,68,68,0.15)";
  if (value <= 6) return "rgba(234,179,8,0.12)";
  return "rgba(34,197,94,0.12)";
}

function deathLabel(cause: DeathCause): { icon: string; text: string } {
  switch (cause) {
    case "vote": return { icon: "🗳️", text: "Éliminé par le village" };
    case "wolves": return { icon: "🐺", text: "Dévoré par les loups" };
    case "hunter": return { icon: "🎯", text: "Tué par le Chasseur" };
    case "witch": return { icon: "🧪", text: "Empoisonné par la Sorcière" };
    case "love": return { icon: "💔", text: "Mort de chagrin" };
    case "petiteFille": return { icon: "👧", text: "Repérée par les loups" };
    default: return { icon: "💀", text: "Éliminé" };
  }
}

export default function PlayerProfileDrawer({ player, onClose }: PlayerProfileDrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!player) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [player, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (player) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [player]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!player) return null;

  const archetype = player.archetype || player.name;
  const traits = PERSONALITY_TRAITS[archetype];
  const desc = PERSONALITY_DESCRIPTIONS[archetype];
  const dead = !player.alive;
  const showRole = dead && player.revealedRole;
  const wolf = showRole && isWolfRole(player.role);
  const death = dead ? deathLabel(player.causeOfDeath ?? null) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={handleBackdropClick}
      style={{
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        animation: "fadeIn 200ms ease",
      }}
    >
      <div
        className="w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl overflow-hidden"
        style={{
          background: "linear-gradient(170deg, #0f0a18 0%, #1a1025 50%, #0f0a18 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          maxHeight: "85vh",
          animation: "slideUp 300ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Close button (desktop) */}
        <div className="hidden sm:flex justify-end px-4 pt-3">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5"
          >
            &times;
          </button>
        </div>

        <div className="px-5 pb-6 pt-2 overflow-y-auto" style={{ maxHeight: "calc(85vh - 40px)" }}>
          {/* Header: emoji + name + personality */}
          <div className="text-center mb-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 border-2"
              style={{
                backgroundColor: (player.color || "#666") + "22",
                borderColor: dead ? "#333" : (player.color || "#666") + "40",
                opacity: dead ? 0.5 : 1,
              }}
            >
              {dead ? "💀" : player.emoji}
            </div>
            <h2
              className="font-display text-xl tracking-wider"
              style={{ color: player.color || "#ccc" }}
            >
              {player.name}
              {player.isHuman && <span className="text-yellow-500 ml-1.5 text-sm">★ Toi</span>}
            </h2>
            {desc && !player.isHuman && (
              <>
                <p className="text-gray-400 text-xs mt-1 tracking-wide uppercase">
                  {desc.emoji} {desc.name}
                </p>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed italic max-w-xs mx-auto">
                  &ldquo;{desc.description}&rdquo;
                </p>
              </>
            )}
            {player.isHuman && (
              <p className="text-gray-500 text-xs mt-1 tracking-wide uppercase">
                Joueur humain
              </p>
            )}
          </div>

          {/* Traits — only for AI players */}
          {traits && !player.isHuman && (
            <div className="mb-5">
              <p className="text-xs text-gray-600 uppercase tracking-widest mb-3 text-center">
                Traits
              </p>
              <div className="space-y-2">
                {TRAIT_LABELS.map((label, i) => {
                  const val = traits[i];
                  const color = traitColor(val);
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-24 text-right">{label}</span>
                      <div
                        className="flex-1 h-2.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: traitBarBg(val) }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${val * 10}%`,
                            backgroundColor: color,
                            boxShadow: `0 0 6px ${color}40`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono w-8" style={{ color }}>
                        {val}/10
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status */}
          <div
            className="rounded-xl px-4 py-3 mb-4"
            style={{
              backgroundColor: dead
                ? "rgba(239,68,68,0.06)"
                : "rgba(34,197,94,0.06)",
              border: dead
                ? "1px solid rgba(239,68,68,0.12)"
                : "1px solid rgba(34,197,94,0.12)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Statut</p>
                <p className={`text-sm font-medium ${dead ? "text-red-400" : "text-green-400"}`}>
                  {dead && death ? `${death.icon} ${death.text}` : "🟢 En vie"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Rôle</p>
                <p className={`text-sm font-medium ${showRole && wolf ? "text-red-400" : showRole ? "text-purple-300" : "text-gray-600"}`}>
                  {showRole ? player.role : "???"}
                </p>
              </div>
            </div>
          </div>

          {/* History placeholder */}
          <div
            className="rounded-xl px-4 py-4 text-center"
            style={{
              backgroundColor: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Historique</p>
            <p className="text-gray-600 text-sm">🔒 Bientôt disponible</p>
            <p className="text-gray-700 text-xs mt-1">
              Connecte-toi pour suivre tes parties avec chaque personnage.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.5; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (min-width: 640px) {
          @keyframes slideUp {
            from { transform: scale(0.95) translateY(10px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}
