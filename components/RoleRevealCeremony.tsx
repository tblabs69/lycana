"use client";

import { useState, useEffect } from "react";
import type { Player, Role } from "@/types/game";
import { isWolfRole } from "@/lib/game-engine";

interface RoleRevealCeremonyProps {
  role: Role;
  roleEmoji: string;
  players: Player[];
  onComplete: () => void;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  "Villageois": "Observe. D\u00e9duis. Survis.",
  "Voyante": "Chaque nuit, tu d\u00e9couvres le r\u00f4le d\u2019un joueur.",
  "Sorci\u00e8re": "Deux potions. Une pour sauver, une pour tuer. Choisis bien.",
  "Chasseur": "Si tu tombes, tu emportes quelqu\u2019un avec toi.",
  "Cupidon": "D\u00e9signe deux amoureux. Leur destin est li\u00e9.",
  "Ancien": "Tu r\u00e9sistes \u00e0 la premi\u00e8re attaque des loups.",
  "Salvateur": "Prot\u00e8ge un joueur chaque nuit.",
  "Corbeau": "D\u00e9signe un suspect, +2 voix contre lui au vote.",
  "Petite Fille": "Espionne les loups. Risqu\u00e9.",
  "Idiot du Village": "Si le village te condamne, tu survis. Mais tu perds ta voix.",
  "Loup-Garou": "La meute chasse. D\u00e9vore un villageois chaque nuit sans te faire rep\u00e9rer.",
  "Loup Alpha": "Convertis un villageois en loup. Une seule chance.",
};

const ROLE_COLORS: Record<string, { bg: string; accent: string; glow: string }> = {
  "Villageois": { bg: "#1a0f2e", accent: "#d4a843", glow: "rgba(212,168,67,0.15)" },
  "Voyante": { bg: "#1a0f2e", accent: "#a78bfa", glow: "rgba(167,139,250,0.15)" },
  "Sorci\u00e8re": { bg: "#0a1a12", accent: "#4ade80", glow: "rgba(74,222,128,0.15)" },
  "Chasseur": { bg: "#1a120a", accent: "#fb923c", glow: "rgba(251,146,60,0.15)" },
  "Cupidon": { bg: "#1a0a18", accent: "#f472b6", glow: "rgba(244,114,182,0.15)" },
  "Ancien": { bg: "#0a1a1a", accent: "#2dd4bf", glow: "rgba(45,212,191,0.15)" },
  "Salvateur": { bg: "#0a0f1a", accent: "#60a5fa", glow: "rgba(96,165,250,0.15)" },
  "Corbeau": { bg: "#121212", accent: "#9ca3af", glow: "rgba(156,163,175,0.15)" },
  "Petite Fille": { bg: "#150a1a", accent: "#c084fc", glow: "rgba(192,132,252,0.15)" },
  "Idiot du Village": { bg: "#1a1a0a", accent: "#facc15", glow: "rgba(250,204,21,0.15)" },
  "Loup-Garou": { bg: "#1a0505", accent: "#f87171", glow: "rgba(248,113,113,0.2)" },
  "Loup Alpha": { bg: "#1a0505", accent: "#ef4444", glow: "rgba(239,68,68,0.2)" },
};

export default function RoleRevealCeremony({
  role,
  roleEmoji,
  players,
  onComplete,
}: RoleRevealCeremonyProps) {
  const [stage, setStage] = useState(0);
  // 0: black screen "Le village dort..."
  // 1: card appears (face down)
  // 2: card flips
  // 3: description appears
  // 4: button appears

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 1200),
      setTimeout(() => setStage(2), 2800),
      setTimeout(() => setStage(3), 3800),
      setTimeout(() => setStage(4), 4800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const colors = ROLE_COLORS[role] || ROLE_COLORS["Villageois"];
  const description = ROLE_DESCRIPTIONS[role] || "Bonne chance.";
  const isWolf = isWolfRole(role);
  const packMates = isWolf
    ? players.filter((p) => isWolfRole(p.role) && !p.isHuman && p.alive)
    : [];

  // Floating particles
  const particles = Array.from({ length: 6 }, (_, i) => ({
    left: `${15 + i * 14}%`,
    delay: `${i * 0.8}s`,
    size: 2 + (i % 3),
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{
        background: `linear-gradient(170deg, #030308 0%, ${colors.bg} 50%, #030308 100%)`,
      }}
    >
      {/* Floating particles */}
      {stage >= 1 &&
        particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.left,
              bottom: "20%",
              width: p.size,
              height: p.size,
              backgroundColor: colors.accent,
              opacity: 0.3,
              animation: `float 4s ease-in-out ${p.delay} infinite`,
            }}
          />
        ))}

      {/* Stage 0: "Le village dort..." */}
      <p
        className="font-display text-base sm:text-lg tracking-widest absolute"
        style={{
          color: "#666",
          opacity: stage === 0 ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      >
        Le village dort...
      </p>

      {/* Card container */}
      <div
        className="card-perspective"
        style={{
          width: 220,
          height: 300,
          opacity: stage >= 1 ? 1 : 0,
          transform: stage >= 1 ? "scale(1)" : "scale(0.8)",
          transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
          animation: stage >= 1 && stage < 2 ? "cardFloat 2s ease-in-out infinite" : "none",
        }}
      >
        <div
          className={`card-inner ${stage >= 2 ? "flipped" : ""}`}
          style={{ width: 220, height: 300, position: "relative" }}
        >
          {/* Card back (face down) */}
          <div
            className="card-face rounded-2xl flex flex-col items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #1a1025 0%, #0f0a18 100%)",
              border: "2px solid rgba(212,168,67,0.3)",
              boxShadow: `0 0 30px ${colors.glow}, 0 8px 32px rgba(0,0,0,0.5)`,
            }}
          >
            <div className="text-4xl mb-3 opacity-40">🃏</div>
            <div
              className="w-16 h-16 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: "rgba(212,168,67,0.2)" }}
            >
              <span className="text-2xl opacity-30">?</span>
            </div>
            <p
              className="font-display text-xs mt-4 tracking-widest opacity-30"
              style={{ color: "#d4a843" }}
            >
              LYCANA
            </p>
          </div>

          {/* Card front (role revealed) */}
          <div
            className="card-face card-back-face rounded-2xl flex flex-col items-center justify-center px-4"
            style={{
              background: `linear-gradient(135deg, ${colors.bg} 0%, #050510 100%)`,
              border: `2px solid ${colors.accent}40`,
              boxShadow: `0 0 40px ${colors.glow}, 0 0 80px ${colors.glow}, 0 8px 32px rgba(0,0,0,0.5)`,
            }}
          >
            <div className="text-5xl mb-3">{roleEmoji}</div>
            <h2
              className="font-display text-lg tracking-widest text-center"
              style={{ color: colors.accent }}
            >
              {role}
            </h2>
            <div
              className="w-12 h-px mt-3 mb-3 rounded-full"
              style={{ backgroundColor: `${colors.accent}40` }}
            />
            <p className="text-gray-400 text-xs text-center leading-relaxed">
              {isWolf ? "Camp des Loups" : "Camp du Village"}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div
        className="mt-8 max-w-xs text-center"
        style={{
          opacity: stage >= 3 ? 1 : 0,
          transform: stage >= 3 ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.6s ease",
        }}
      >
        <p className="text-gray-300 text-sm leading-relaxed">{description}</p>

        {/* Pack mates for wolves */}
        {isWolf && packMates.length > 0 && (
          <p className="text-red-400/80 text-sm mt-3">
            Ta meute :{" "}
            {packMates.map((p) => (
              <span key={p.name} className="font-bold" style={{ color: p.color }}>
                {p.emoji} {p.name}
              </span>
            )).reduce<React.ReactNode[]>((acc, el, i) => {
              if (i > 0) acc.push(<span key={`sep-${i}`}>, </span>);
              acc.push(el);
              return acc;
            }, [])}
          </p>
        )}
      </div>

      {/* Button */}
      <div
        className="mt-8"
        style={{
          opacity: stage >= 4 ? 1 : 0,
          transform: stage >= 4 ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.6s ease",
        }}
      >
        <button
          onClick={onComplete}
          className="px-8 py-3 rounded-xl font-display text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}99)`,
            color: "#0a0a0f",
            boxShadow: `0 4px 20px ${colors.glow}`,
          }}
        >
          COMPRIS
        </button>
      </div>
    </div>
  );
}
