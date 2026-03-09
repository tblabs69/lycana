"use client";

import { useState } from "react";
import type { Player, Message, NightResponse, SeerEntry, Lovers, JournalEntry } from "@/types/game";
import { isWolfRole } from "@/lib/game-engine";

interface DebugPanelProps {
  players: Player[];
  messages: Message[];
  cycle: number;
  nightData: NightResponse | null;
  seerLog: SeerEntry[];
  lovers: Lovers | null;
  corbeauTarget: string | null;
  directives: Map<string, string>;
  wolfReason?: string | null;
}

export default function DebugPanel({
  players, messages, cycle, nightData, seerLog,
  lovers, corbeauTarget, directives, wolfReason,
}: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [tab, setTab] = useState<"wolf" | "love" | "directives" | "roles" | "journal">("wolf");
  const [journalPlayer, setJournalPlayer] = useState<string | null>(null);

  const wolves = players.filter((p) => isWolfRole(p.role));
  const wolfMessages = messages.filter((m) => m.isNight && m.cycle === cycle);
  const loveMessages = messages.filter(
    (m) => m.isNight && m.color === "#ec4899" && m.cycle === cycle
  );

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-3 right-3 z-[60] px-3 py-1.5 rounded-lg text-xs font-mono"
        style={{
          background: "rgba(0,0,0,0.85)",
          border: "1px solid rgba(255,100,100,0.3)",
          color: "#f87171",
        }}
      >
        DEBUG
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-0 right-0 z-[60] w-96 max-w-[90vw] max-h-[50vh] flex flex-col rounded-tl-xl overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.92)",
        border: "1px solid rgba(255,100,100,0.2)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
        <span className="text-red-400 text-xs font-mono font-bold">DEBUG — Cycle {cycle}</span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-500 hover:text-gray-300 text-xs"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {(["wolf", "love", "directives", "roles", "journal"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-2 py-1 text-xs font-mono transition-colors ${
              tab === t ? "text-red-400 bg-white/5" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t === "wolf" ? "🐺 Loups" : t === "love" ? "💘 Amour" : t === "directives" ? "📋 Dir." : t === "roles" ? "🎭 Rôles" : "📓 Journal"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 text-xs font-mono space-y-1" style={{ maxHeight: "35vh" }}>
        {tab === "wolf" && (
          <>
            <div className="text-red-300/80 mb-1">Meute : {wolves.map((w) => `${w.name} (${w.role})`).join(", ") || "aucun"}</div>
            {nightData?.wolfTarget && (
              <div className="text-red-200">
                Cible : <span className="text-white font-bold">{nightData.wolfTarget}</span>
              </div>
            )}
            {wolfReason && (
              <div className="text-red-300/60 italic">&laquo; {wolfReason} &raquo;</div>
            )}
            {nightData?.alphaConverted && (
              <div className="text-purple-300">Alpha convertit : {nightData.alphaConverted}</div>
            )}
            {nightData?.witchAction && (
              <div className="text-green-300">Sorcière : {nightData.witchAction}</div>
            )}
            {nightData?.salvateurTarget && (
              <div className="text-blue-300">Salvateur protège : {nightData.salvateurTarget}</div>
            )}
            <div className="border-t border-white/5 mt-2 pt-2 text-gray-400">
              Messages de nuit (cycle {cycle}):
            </div>
            {wolfMessages.length === 0 && <div className="text-gray-600">Aucun</div>}
            {wolfMessages.map((m, i) => (
              <div key={i} className="text-gray-300">
                {m.speaker && <span style={{ color: m.color || "#ccc" }}>{m.speaker}: </span>}
                {m.text}
              </div>
            ))}
          </>
        )}

        {tab === "love" && (
          <>
            {lovers ? (
              <>
                <div className="text-pink-300/80">
                  Couple : {lovers.player1} + {lovers.player2}
                </div>
                <div className="text-pink-300/60">
                  Mixte : {lovers.isMixedCouple ? "oui" : "non"} |
                  Statut connu : {lovers.coupleKnowsMixedStatus ? "oui" : "non"}
                </div>
                {(() => {
                  const p1 = players.find((p) => p.name === lovers.player1);
                  const p2 = players.find((p) => p.name === lovers.player2);
                  return (
                    <div className="text-gray-400">
                      {p1 && <div>{p1.name}: {p1.role} ({p1.alive ? "vivant" : "mort"})</div>}
                      {p2 && <div>{p2.name}: {p2.role} ({p2.alive ? "vivant" : "mort"})</div>}
                    </div>
                  );
                })()}
                <div className="border-t border-white/5 mt-2 pt-2 text-gray-400">
                  Love chat (cycle {cycle}):
                </div>
                {loveMessages.length === 0 && <div className="text-gray-600">Aucun ce cycle</div>}
                {loveMessages.map((m, i) => (
                  <div key={i} className="text-pink-200">
                    {m.speaker && <span style={{ color: m.color || "#ec4899" }}>{m.speaker}: </span>}
                    {m.text}
                  </div>
                ))}
              </>
            ) : (
              <div className="text-gray-600">Pas de couple formé</div>
            )}
          </>
        )}

        {tab === "directives" && (
          <>
            <div className="text-gray-400 mb-1">Directives de tour :</div>
            {directives.size === 0 && <div className="text-gray-600">Aucune (pas en débat)</div>}
            {Array.from(directives.entries()).map(([name, dir]) => {
              const p = players.find((pl) => pl.name === name);
              return (
                <div key={name} className="mb-1">
                  <span style={{ color: p?.color || "#ccc" }}>{name}</span>
                  <span className="text-gray-500"> [{p?.role}]</span>
                  <div className="text-gray-400 ml-2">{dir}</div>
                </div>
              );
            })}
            {corbeauTarget && (
              <div className="border-t border-white/5 mt-2 pt-2">
                <span className="text-gray-400">🐦 Corbeau cible : </span>
                <span className="text-white font-bold">{corbeauTarget}</span> (+2 voix)
              </div>
            )}
          </>
        )}

        {tab === "roles" && (
          <>
            <div className="text-gray-400 mb-1">Tous les rôles :</div>
            {players.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <span style={{ color: p.color || "#ccc" }}>{p.emoji} {p.name}</span>
                <span className={`${isWolfRole(p.role) ? "text-red-400" : "text-gray-400"}`}>
                  {p.role}
                </span>
                {!p.alive && <span className="text-gray-600">💀</span>}
                {p.isHuman && <span className="text-yellow-400">(toi)</span>}
                {lovers && (p.name === lovers.player1 || p.name === lovers.player2) && (
                  <span className="text-pink-400">💘</span>
                )}
              </div>
            ))}
            <div className="border-t border-white/5 mt-2 pt-2 text-gray-400">
              Voyante — Inspections :
            </div>
            {seerLog.length === 0 && <div className="text-gray-600">Aucune</div>}
            {seerLog.map((s, i) => (
              <div key={i} className="text-purple-300">
                C{s.cycle}: {s.target} = {s.result}
              </div>
            ))}
          </>
        )}

        {tab === "journal" && (
          <>
            <div className="text-gray-400 mb-2">Sélectionne un joueur :</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {players.filter((p) => !p.isHuman).map((p) => (
                <button
                  key={p.name}
                  onClick={() => setJournalPlayer(p.name)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    journalPlayer === p.name
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-gray-400 hover:text-gray-200"
                  }`}
                  style={{ borderLeft: `2px solid ${p.color || "#666"}` }}
                >
                  {p.emoji} {p.name}
                  {(p.internalJournal?.length || 0) > 0 && (
                    <span className="text-gray-500 ml-1">({p.internalJournal!.length})</span>
                  )}
                </button>
              ))}
            </div>
            {journalPlayer && (() => {
              const p = players.find((pl) => pl.name === journalPlayer);
              const journal = p?.internalJournal || [];
              if (journal.length === 0) return <div className="text-gray-600">Aucune entrée.</div>;
              return journal.map((entry, i) => (
                <div key={i} className="mb-2 p-1.5 rounded bg-white/5">
                  <div className="text-yellow-300/80 font-bold text-[10px] mb-1">[{entry.phase}]</div>
                  {entry.observations && <div className="text-gray-300"><span className="text-gray-500">OBS:</span> {entry.observations}</div>}
                  {entry.analysis && <div className="text-blue-300/80"><span className="text-gray-500">ANA:</span> {entry.analysis}</div>}
                  {entry.suspicions && <div className="text-red-300/80"><span className="text-gray-500">SUS:</span> {entry.suspicions}</div>}
                  {entry.alliances && <div className="text-green-300/80"><span className="text-gray-500">ALL:</span> {entry.alliances}</div>}
                  {entry.threats && <div className="text-orange-300/80"><span className="text-gray-500">MEN:</span> {entry.threats}</div>}
                  {entry.strategy && <div className="text-purple-300/80"><span className="text-gray-500">STR:</span> {entry.strategy}</div>}
                </div>
              ));
            })()}
            {!journalPlayer && <div className="text-gray-600">Clique sur un joueur pour voir son journal.</div>}
          </>
        )}
      </div>
    </div>
  );
}
