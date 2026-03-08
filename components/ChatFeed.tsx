"use client";

import { useEffect, useRef } from "react";
import type { Message, Player, VoteReveal, Phase } from "@/types/game";

interface ChatFeedProps {
  messages: Message[];
  nText: string;
  loading: boolean;
  speaker: string | null;
  players: Player[];
  vReveals: VoteReveal[];
  phase: Phase;
  winner: "village" | "loups" | "couple" | null;
}

export default function ChatFeed({
  messages,
  nText,
  loading,
  speaker,
  players,
  vReveals,
  phase,
  winner,
}: ChatFeedProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages, speaker, nText, vReveals]);

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto px-3 sm:px-4 py-3"
      style={{ maxHeight: "calc(100vh - 260px)" }}
    >
      {messages.map((m, i) => (
        <ChatMsg key={i} m={m} />
      ))}

      {nText && (
        <div className="flex justify-center my-4">
          <div className="bg-indigo-950/60 border border-indigo-700/20 rounded-2xl px-6 py-4 max-w-xs text-center">
            <div className="text-3xl mb-2">🌙</div>
            <p className="text-indigo-200 text-sm animate-pulse">{nText}</p>
          </div>
        </div>
      )}

      {loading && speaker && (
        <TypingDots
          name={speaker}
          emoji={players.find((p) => p.name === speaker)?.emoji ?? "🤔"}
        />
      )}

      {(phase === "voteAI" || phase === "voteAuto" || phase === "humanNight") && loading && (
        <div className="flex justify-center my-3">
          <div className="bg-purple-950/40 border border-purple-700/20 rounded-xl px-4 py-2">
            <p className="text-purple-300 text-sm animate-pulse">
              Délibération...
            </p>
          </div>
        </div>
      )}

      {vReveals.length > 0 && (
        <VoteRevealPanel vReveals={vReveals} players={players} />
      )}

      {phase === "gameOver" && <RoleReveal players={players} />}
    </div>
  );
}

function ChatMsg({ m }: { m: Message }) {
  if (m.isSystem) {
    const bg = m.isNight
      ? "bg-indigo-950/50 border-indigo-800/20"
      : m.isDawn
      ? "bg-amber-950/40 border-amber-800/20"
      : m.isVictory
      ? "bg-emerald-950/40 border-emerald-700/20"
      : m.isCycleSep
      ? "bg-transparent border-white/5"
      : "bg-red-950/30 border-red-800/20";
    const tx = m.isNight
      ? "text-indigo-300"
      : m.isDawn
      ? "text-amber-200"
      : m.isVictory
      ? "text-emerald-200"
      : m.isCycleSep
      ? "text-gray-600 text-xs not-italic uppercase tracking-widest"
      : "text-red-200";
    return (
      <div className="flex justify-center my-2">
        <div
          className={`rounded-xl px-4 py-2 max-w-lg text-center border ${bg}`}
        >
          <p className={`text-sm italic ${tx}`}>{m.text}</p>
        </div>
      </div>
    );
  }

  const isHuman = m.isHuman;
  return (
    <div
      className={`flex gap-2.5 my-1.5 ${isHuman ? "flex-row-reverse" : ""}`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-1"
        style={{ backgroundColor: (m.color || "#666") + "22" }}
      >
        {m.emoji}
      </div>
      <div className={`max-w-sm sm:max-w-md ${isHuman ? "text-right" : ""}`}>
        <span className="text-xs font-semibold" style={{ color: m.color }}>
          {m.speaker}
        </span>
        <div
          className={`mt-0.5 rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            isHuman
              ? "bg-yellow-900/25 border border-yellow-700/20 text-yellow-100"
              : "border text-gray-200"
          }`}
          style={
            !isHuman
              ? {
                  backgroundColor: (m.color || "#666") + "0a",
                  borderColor: (m.color || "#666") + "18",
                }
              : undefined
          }
        >
          {m.text}
        </div>
      </div>
    </div>
  );
}

function TypingDots({ name, emoji }: { name: string; emoji: string }) {
  return (
    <div className="flex gap-2.5 my-1.5 items-center">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-base"
        style={{ backgroundColor: "#ffffff08" }}
      >
        {emoji}
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/5 border border-white/8">
        <span className="text-xs text-gray-400">{name}</span>
        <span className="flex gap-0.5">
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: d + "ms" }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

function VoteRevealPanel({
  vReveals,
  players,
}: {
  vReveals: VoteReveal[];
  players: Player[];
}) {
  return (
    <div className="flex justify-center my-3">
      <div className="bg-red-950/25 border border-red-800/20 rounded-xl px-4 py-3 max-w-md w-full">
        <p className="text-red-300 text-xs font-bold mb-2 text-center uppercase tracking-wider">
          Votes
        </p>
        {vReveals.map((v, i) => {
          const voter = players.find((p) => p.name === v.voter);
          const target = players.find((p) => p.name === v.target);
          return (
            <div
              key={i}
              className="flex items-center justify-between text-sm fade-up my-1 px-1"
            >
              <span style={{ color: voter?.color }} className="font-medium">
                {v.voter}
                {v.isHuman ? " ★" : ""}
              </span>
              <span className="text-gray-600 mx-1">→</span>
              <span style={{ color: target?.color }} className="font-medium">
                {v.target}
              </span>
              {v.reason && (
                <span className="text-gray-600 text-xs ml-2 hidden sm:inline">
                  &ldquo;{v.reason}&rdquo;
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleReveal({ players }: { players: Player[] }) {
  return (
    <div className="flex justify-center my-4">
      <div className="bg-white/5 border border-white/8 rounded-xl px-5 py-3 max-w-sm">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 text-center">
          Rôles
        </p>
        <div className="grid grid-cols-2 gap-1">
          {players.map((p) => {
            return (
              <div
                key={p.name}
                className={`flex items-center gap-1.5 text-xs py-0.5 ${
                  p.alive ? "" : "opacity-40"
                }`}
              >
                <span>{p.alive ? p.emoji : "💀"}</span>
                <span style={{ color: p.color }}>{p.name}</span>
                <span
                  className={`ml-auto ${
                    p.role === "Loup-Garou" || p.role === "Loup Alpha"
                      ? "text-red-400 font-bold"
                      : "text-gray-500"
                  }`}
                >
                  {p.role === "Loup-Garou" ? "🐺 Loup" : p.role === "Loup Alpha" ? "🐺👑 Alpha" : p.role === "Villageois" ? "Village" : p.role}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
