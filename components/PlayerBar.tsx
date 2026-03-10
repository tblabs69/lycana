"use client";

import type { Player } from "@/types/game";

interface PlayerBarProps {
  players: Player[];
  speaker: string | null;
  loading: boolean;
  onPlayerClick?: (player: Player) => void;
}

export default function PlayerBar({ players, speaker, loading, onPlayerClick }: PlayerBarProps) {
  return (
    <div className="flex gap-1.5 sm:gap-3 py-2.5 px-3 border-b border-white/5 overflow-x-auto scrollbar-hide sm:justify-center sm:flex-wrap">
      {players.map((p) => (
        <PlayerBadge
          key={p.name}
          player={p}
          active={speaker === p.name}
          speaking={speaker === p.name && loading}
          onClick={onPlayerClick ? () => onPlayerClick(p) : undefined}
        />
      ))}
    </div>
  );
}

function PlayerBadge({
  player: p,
  active,
  speaking,
  onClick,
}: {
  player: Player;
  active: boolean;
  speaking: boolean;
  onClick?: () => void;
}) {
  const dead = !p.alive;
  return (
    <div
      className={`flex flex-col items-center transition-all duration-500 ${active ? "scale-110" : ""} ${dead ? "opacity-30" : ""} ${onClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""}`}
      style={{ minWidth: 48 }}
      onClick={onClick}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center text-xl border-2 transition-all ${
          speaking
            ? "border-yellow-400 shadow-lg shadow-yellow-400/30"
            : active
            ? "border-yellow-600/80"
            : dead
            ? "border-gray-800"
            : "border-white/15"
        }`}
        style={{ backgroundColor: dead ? "#111" : p.color + "22" }}
      >
        {dead ? "💀" : p.emoji}
      </div>
      <span
        className={`mt-1 text-xs font-medium ${
          speaking ? "text-yellow-300" : dead ? "text-gray-600" : "text-gray-300"
        }`}
      >
        {p.name}
        {p.isHuman && !dead && (
          <span className="text-yellow-500 ml-0.5">★</span>
        )}
      </span>
      {/* D1: Show role for dead/revealed players */}
      {p.revealedRole && (
        <span
          className={`text-xs -mt-0.5 leading-tight ${
            p.role === "Loup-Garou" || p.role === "Loup Alpha" ? "text-red-500" : "text-gray-500"
          }`}
        >
          {p.role === "Loup-Garou" ? "🐺 Loup"
            : p.role === "Loup Alpha" ? "🐺👑"
            : p.idiotRevealed && p.alive ? "🤪 Idiot"
            : dead ? p.role : ""}
        </span>
      )}
    </div>
  );
}
