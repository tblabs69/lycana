"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { Role, GameConfig } from "@/types/game";
import { ROLE_CATALOG, getWolfCount, getPreset, buildRolesFromConfig } from "@/lib/game-engine";

interface ConfigScreenProps {
  onStart: (config: GameConfig) => void;
  onShowTuto: () => void;
}

export default function ConfigScreen({ onStart, onShowTuto }: ConfigScreenProps) {
  const [playerCount, setPlayerCount] = useState(8);
  const [selectedRoles, setSelectedRoles] = useState<Set<Role>>(
    new Set(["Voyante", "Sorcière", "Chasseur"])
  );
  const [preset, setPreset] = useState<string>("classique");
  const [showCustom, setShowCustom] = useState(false);
  const [humanName, setHumanName] = useState("");
  const [byokKey, setByokKey] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("lycana_byok") || "";
    }
    return "";
  });
  const [showByokPassword, setShowByokPassword] = useState(false);
  const [showByokDetails, setShowByokDetails] = useState(false);
  const [byokValidated, setByokValidated] = useState(false);
  const [byokValidating, setByokValidating] = useState(false);
  const [byokToast, setByokToast] = useState(false);
  const byokInputRef = useRef<HTMLInputElement>(null);

  const wolfCount = getWolfCount(playerCount);

  const availableRoles = useMemo(
    () => ROLE_CATALOG.filter((r) => !r.alwaysActive && r.minPlayers <= playerCount),
    [playerCount]
  );

  const specialCount = selectedRoles.size;
  const hasAlpha = selectedRoles.has("Loup Alpha");
  const villageoisCount = playerCount - wolfCount - specialCount;
  const tooManySpecials = villageoisCount < 2;

  function toggleRole(role: Role) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
    setPreset("personnalisé");
  }

  function applyPreset(name: string) {
    const p = getPreset(name);
    setPlayerCount(p.playerCount);
    setPreset(name);
    setShowCustom(false);

    // Extract special roles from preset
    const specials = new Set<Role>();
    p.roles.forEach((r) => {
      if (r !== "Loup-Garou" && r !== "Loup Alpha" && r !== "Villageois") {
        specials.add(r);
      }
      if (r === "Loup Alpha") specials.add(r);
    });
    setSelectedRoles(specials);
  }

  function handleStart() {
    const roles = buildRolesFromConfig(playerCount, [...selectedRoles], wolfCount);
    // Store BYOK key in sessionStorage (never sent to server in body, only via header)
    const trimmedKey = byokKey.trim();
    if (trimmedKey) {
      sessionStorage.setItem("lycana_byok", trimmedKey);
    } else {
      sessionStorage.removeItem("lycana_byok");
    }
    onStart({
      playerCount,
      wolfCount,
      roles,
      preset: preset as GameConfig["preset"],
      humanName: humanName.trim() || "Joueur",
      byokKey: trimmedKey || undefined,
    });
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🌕</div>
          <h1 className="font-display text-3xl tracking-widest mb-2" style={{ color: "#d4a843" }}>
            LYCANA
          </h1>
          <p className="text-gray-400 text-sm mb-1">
            Joue au Loup-Garou. Seul. Quand tu veux.
          </p>
          <p className="text-gray-600 text-xs">
            8 à 15 joueurs. Bluff, déduction, survie.
          </p>
        </div>

        {/* Human name */}
        <div className="bg-white/5 border border-white/8 rounded-xl p-4 mb-4">
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
            Ton prénom
          </label>
          <input
            type="text"
            value={humanName}
            onChange={(e) => setHumanName(e.target.value)}
            placeholder="Entre ton prénom..."
            maxLength={20}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600/50 transition-colors"
          />
        </div>

        {/* BYOK — Clé API perso */}
        <div className="bg-white/5 border border-white/8 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">
              🔑 Ta clé API Anthropic <span className="text-gray-600 normal-case">(optionnel)</span>
            </label>
            {byokValidated && (
              <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                <span className="text-green-500">&#10003;</span> Clé active
              </span>
            )}
          </div>

          {/* Input + eye toggle + lock badge */}
          {!byokValidated ? (
            <>
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={byokInputRef}
                    type={showByokPassword ? "text" : "password"}
                    value={byokKey}
                    onChange={(e) => { setByokKey(e.target.value); setByokValidated(false); }}
                    placeholder="sk-ant-..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600/50 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowByokPassword(!showByokPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
                    title={showByokPassword ? "Masquer" : "Afficher"}
                  >
                    {showByokPassword ? "\u{1F441}" : "\u{1F441}\u{200D}\u{1F5E8}"}
                  </button>
                </div>
                {byokKey.trim() && (
                  <span className="flex items-center gap-1 text-green-500/70 text-xs whitespace-nowrap shrink-0">
                    <span>&#128274;</span> Sécurisé
                  </span>
                )}
              </div>

              {/* Validate button */}
              {byokKey.trim() && !byokValidated && (
                <button
                  type="button"
                  disabled={byokValidating}
                  onClick={async () => {
                    setByokValidating(true);
                    try {
                      const res = await fetch("/api/debate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "x-api-key": byokKey.trim() },
                        body: JSON.stringify({
                          player: { name: "Test", emoji: "🧪", color: "#888", gender: "il", role: "Villageois", alive: true, revealedRole: false, archetype: "prudent" },
                          players: [], messages: [], cycle: 1, round: 1, nightResult: null, history: [], seerLog: [],
                        }),
                      });
                      if (res.status === 401) {
                        alert("Clé invalide ou expirée. Verifie-la sur console.anthropic.com");
                      } else {
                        setByokValidated(true);
                        setByokToast(true);
                        sessionStorage.setItem("lycana_byok", byokKey.trim());
                        setTimeout(() => setByokToast(false), 3500);
                      }
                    } catch {
                      alert("Erreur de connexion. Réessaie.");
                    }
                    setByokValidating(false);
                  }}
                  className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-yellow-700/40 bg-yellow-900/20 text-yellow-300 hover:bg-yellow-900/40 disabled:opacity-50"
                >
                  {byokValidating ? "Vérification..." : "Vérifier la clé"}
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 py-1">
              <span className="text-green-400 text-sm">&#128274; Clé configurée</span>
              <button
                type="button"
                onClick={() => {
                  setByokValidated(false);
                  setByokKey("");
                  sessionStorage.removeItem("lycana_byok");
                }}
                className="text-gray-500 text-xs hover:text-gray-300 transition-colors underline underline-offset-2 ml-auto"
              >
                Changer
              </button>
            </div>
          )}

          {/* Reassurance text */}
          <p className="text-gray-500 text-xs mt-3 leading-relaxed">
            &#128274; Ta clé reste sur ton navigateur. Elle n&apos;est jamais stockée sur nos serveurs, jamais partagée, jamais enregistrée. Elle est utilisée uniquement pour les appels API pendant ta partie et disparaît quand tu fermes l&apos;onglet.
          </p>

          {/* "Comment ça marche ?" accordion */}
          <button
            type="button"
            onClick={() => setShowByokDetails(!showByokDetails)}
            className="text-yellow-600/80 text-xs hover:text-yellow-500 transition-colors mt-2 flex items-center gap-1"
          >
            <span className={`inline-block transition-transform ${showByokDetails ? "rotate-90" : ""}`}>&#9656;</span>
            Comment ça marche ?
          </button>
          {showByokDetails && (
            <ul className="mt-2 space-y-1.5 text-xs text-gray-500 pl-3 border-l border-white/5">
              <li>&#8226; Ta clé est envoyée directement de ton navigateur à l&apos;API Anthropic. Nos serveurs servent juste de relais sécurisé.</li>
              <li>&#8226; Elle est stockée dans le <span className="text-gray-400 font-mono">sessionStorage</span> de ton navigateur : elle disparaît dès que tu fermes l&apos;onglet.</li>
              <li>&#8226; Aucune donnée personnelle n&apos;est collectée.</li>
            </ul>
          )}

          {/* Get a key link */}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-yellow-600/80 text-xs hover:text-yellow-500 transition-colors mt-2"
          >
            Obtenir une clé gratuitement &#8594;
          </a>
          <p className="text-gray-600 text-xs mt-0.5">
            Crée un compte Anthropic (gratuit) et génère une clé API. Coût moyen d&apos;une partie : ~0.30€.
          </p>
        </div>

        {/* BYOK toast */}
        {byokToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-green-900/80 border border-green-600/40 text-green-200 text-sm font-medium shadow-lg animate-fade-in">
            &#10004; Clé valide — bonne partie !
          </div>
        )}

        {/* Presets */}
        <div className="flex gap-2 justify-center mb-5 flex-wrap">
          {[
            { name: "classique", label: "Classique", sub: "8J" },
            { name: "étendu", label: "Étendu", sub: "10J" },
            { name: "intense", label: "Intense", sub: "12J" },
            { name: "chaos", label: "Chaos", sub: "15J" },
          ].map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p.name)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                preset === p.name
                  ? "border-yellow-600 bg-yellow-900/30 text-yellow-300"
                  : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {p.label} <span className="text-xs opacity-60">{p.sub}</span>
            </button>
          ))}
          <button
            onClick={() => setShowCustom(true)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              preset === "personnalisé"
                ? "border-purple-600 bg-purple-900/30 text-purple-300"
                : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            Personnaliser
          </button>
        </div>

        {/* Player count slider */}
        {(showCustom || preset === "personnalisé") && (
          <div className="bg-white/5 border border-white/8 rounded-xl p-4 mb-4">
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">
              Nombre de joueurs
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={8}
                max={15}
                value={playerCount}
                onChange={(e) => {
                  setPlayerCount(Number(e.target.value));
                  setPreset("personnalisé");
                }}
                className="flex-1 accent-yellow-500"
              />
              <span className="text-yellow-400 font-bold text-lg w-8 text-center">
                {playerCount}
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              {playerCount} joueurs dont {wolfCount} loups
            </p>
          </div>
        )}

        {/* Role cards */}
        {(showCustom || preset === "personnalisé") && (
          <div className="bg-white/5 border border-white/8 rounded-xl p-4 mb-4">
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-3">
              Rôles spéciaux
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableRoles.map((card) => {
                const active = selectedRoles.has(card.role);
                const isDefault = card.defaultActive;
                return (
                  <button
                    key={card.role}
                    onClick={() => toggleRole(card.role)}
                    className={`flex items-start gap-2 p-2.5 rounded-lg text-left text-xs transition-all border ${
                      active
                        ? card.camp === "loups"
                          ? "border-red-700/40 bg-red-900/20 text-red-200"
                          : "border-green-700/40 bg-green-900/20 text-green-200"
                        : "border-white/8 bg-white/3 text-gray-500 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-base">{card.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {card.label}
                        {isDefault && !active && (
                          <span className="text-gray-600 ml-1">(rec.)</span>
                        )}
                      </div>
                      <div className="text-gray-600 mt-0.5 line-clamp-2">{card.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-red-400">
              🐺 Loups: <span className="font-bold">{wolfCount}{hasAlpha ? " (dont Alpha)" : ""}</span>
            </span>
            <span className="text-white/10">|</span>
            <span className="text-blue-400">
              ⭐ Spéciaux: <span className="font-bold">{specialCount}</span>
            </span>
            <span className="text-white/10">|</span>
            <span className={`${tooManySpecials ? "text-red-400" : "text-gray-400"}`}>
              👤 Villageois: <span className="font-bold">{Math.max(villageoisCount, 0)}</span>
            </span>
            <span className="text-white/10">|</span>
            <span className="text-green-400">
              Total: <span className="font-bold">{playerCount}</span>
            </span>
          </div>
          {tooManySpecials && (
            <p className="text-red-400 text-xs mt-2">
              ⚠️ Trop de rôles spéciaux — ajoute des joueurs ou retire un rôle
            </p>
          )}
        </div>

        {/* Start button */}
        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={tooManySpecials || humanName.trim().length < 2}
            className="px-8 py-3 rounded-xl font-display text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-yellow-900/20 disabled:opacity-30 disabled:hover:scale-100"
            style={{
              background: (tooManySpecials || humanName.trim().length < 2) ? "#333" : "linear-gradient(135deg,#d4a843,#b8892e)",
              color: "#1a0f2e",
            }}
          >
            {humanName.trim().length < 2 ? "ENTRE TON PRÉNOM" : "PREMIÈRE NUIT"}
          </button>
          <button
            onClick={onShowTuto}
            className="block mx-auto mt-3 text-gray-500 text-xs hover:text-gray-300 transition-colors underline underline-offset-2"
          >
            Comment jouer ?
          </button>
        </div>
      </div>
    </div>
  );
}
