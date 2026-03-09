import type {
  Player,
  JournalEntry,
  NightResult,
  HistoryEntry,
  VoteReveal,
  Message,
  SeerEntry,
  Potions,
  Lovers,
} from "@/types/game";
import { isWolfRole } from "@/lib/game-engine";

// ── PHASE RECAP BUILDERS ─────────────────────────────────────────────────
// These build factual summaries of what happened, constructed by code (not AI).

/** Build recap after dawn (night resolution) */
export function buildDawnRecap(
  cycle: number,
  nightResult: NightResult,
  players: Player[],
  seerLog: SeerEntry[],
  potions: Potions,
  lovers: Lovers | null,
): string {
  const alive = players.filter((p) => p.alive);
  const dead = players.filter((p) => !p.alive && p.revealedRole);

  let recap = `PHASE : Aube du jour ${cycle}\n`;

  if (nightResult.deaths.length > 0) {
    recap += "MORTS CETTE NUIT :\n";
    for (const d of nightResult.deaths) {
      let cause = "cause inconnue";
      if (nightResult.wolfTarget === d.name && !nightResult.saved) cause = "dévoré par les loups";
      else if (d.role === "Petite Fille" && nightResult.petiteFilleResult?.caught) cause = "repérée en espionnant les loups";
      else cause = "empoisonné par la Sorcière";
      recap += `- ${d.name} — ${cause} — rôle révélé : ${d.role}\n`;
    }
  } else {
    recap += "Aucune victime cette nuit.\n";
  }

  recap += `JOUEURS ENCORE EN VIE (${alive.length}) : ${alive.map((p) => p.name).join(", ")}\n`;

  if (dead.length > 0) {
    recap += "RÔLES RÉVÉLÉS JUSQU'ICI : ";
    recap += dead.map((p) => `${p.name} → ${p.role}`).join(", ") + "\n";
  }

  // Powers still in play
  const powerNotes: string[] = [];
  const witchAlive = alive.find((p) => p.role === "Sorcière");
  if (witchAlive) {
    const pots: string[] = [];
    if (potions.heal) pots.push("guérison");
    if (potions.poison) pots.push("poison");
    powerNotes.push(`Sorcière vivante (potions : ${pots.length ? pots.join(" + ") : "aucune"})`);
  }
  const voyante = alive.find((p) => p.role === "Voyante");
  if (voyante) powerNotes.push("Voyante vivante");
  else if (dead.find((p) => p.role === "Voyante")) powerNotes.push("Voyante morte");
  const chasseur = alive.find((p) => p.role === "Chasseur");
  if (chasseur) powerNotes.push("Chasseur vivant");
  const salvateur = alive.find((p) => p.role === "Salvateur");
  if (salvateur) powerNotes.push("Salvateur vivant");

  if (powerNotes.length > 0) {
    recap += `POUVOIRS ENCORE EN JEU : ${powerNotes.join(" / ")}\n`;
  }

  if (nightResult.corbeauTarget) {
    const corbeauP = alive.find((p) => p.name === nightResult.corbeauTarget);
    if (corbeauP) {
      recap += `Le Corbeau a désigné ${nightResult.corbeauTarget} : +2 voix contre lui au vote.\n`;
    }
  }

  return recap;
}

/** Build recap after a debate round */
export function buildDebateRecap(
  cycle: number,
  round: number,
  messages: Message[],
  players: Player[],
  currentPlayerName: string,
): string {
  const roundMessages = messages.filter(
    (m) => m.cycle === cycle && !m.isSystem && m.speaker
  );

  let recap = `PHASE : Jour ${cycle}, Tour ${round}\nCE QUI A ÉTÉ DIT :\n`;

  for (const msg of roundMessages) {
    // Truncate to ~20 words
    const words = msg.text.split(/\s+/);
    const summary = words.slice(0, 20).join(" ") + (words.length > 20 ? "..." : "");
    recap += `- ${msg.speaker} a dit : "${summary}"\n`;
  }

  // Who didn't speak
  const alive = players.filter((p) => p.alive);
  const speakers = new Set(roundMessages.map((m) => m.speaker));
  const silent = alive.filter((p) => !speakers.has(p.name));
  if (silent.length > 0) {
    recap += `JOUEURS QUI N'ONT PAS PARLÉ CE TOUR : ${silent.map((p) => p.name).join(", ")}\n`;
  }

  // Extract accusations
  const accusations: string[] = [];
  const defenses: string[] = [];
  for (const msg of roundMessages) {
    if (!msg.speaker) continue;
    const text = msg.text.toLowerCase();
    for (const target of alive) {
      if (target.name === msg.speaker) continue;
      if (!text.includes(target.name.toLowerCase())) continue;
      const accuseWords = ["suspect", "loup", "louche", "menteur", "vote", "accuse", "élimine"];
      const defendWords = ["innocent", "confiance", "défend", "raison", "d'accord"];
      if (accuseWords.some((w) => text.includes(w))) {
        accusations.push(`${msg.speaker} a accusé ${target.name}`);
      }
      if (defendWords.some((w) => text.includes(w))) {
        defenses.push(`${msg.speaker} a défendu ${target.name}`);
      }
    }
  }
  if (accusations.length > 0) {
    recap += "ACCUSATIONS DE CE TOUR :\n";
    accusations.forEach((a) => (recap += `- ${a}\n`));
  }
  if (defenses.length > 0) {
    defenses.forEach((d) => (recap += `- ${d}\n`));
  }

  // Was the current player mentioned?
  const mentionedByOthers = roundMessages.filter(
    (m) => m.speaker !== currentPlayerName && m.text.toLowerCase().includes(currentPlayerName.toLowerCase())
  );
  if (mentionedByOthers.length > 0) {
    recap += `\n⚠️ TU AS ÉTÉ MENTIONNÉ(E) : `;
    const mentioners = mentionedByOthers.map((m) => m.speaker).filter(Boolean);
    recap += `${mentioners.join(", ")} t'a/ont mentionné\n`;
  }

  return recap;
}

/** Build recap after vote */
export function buildVoteRecap(
  cycle: number,
  eliminatedName: string | null,
  eliminatedRole: string | null,
  voteReveals: VoteReveal[],
  tie: boolean,
): string {
  let recap = `PHASE : Vote du jour ${cycle}\n`;

  if (tie || !eliminatedName) {
    recap += "RÉSULTAT : Égalité, pas d'élimination.\n";
  } else {
    const voteCount = voteReveals.filter((v) => v.target === eliminatedName).length;
    recap += `RÉSULTAT : ${eliminatedName} éliminé avec ${voteCount} voix — rôle révélé : ${eliminatedRole || "inconnu"}\n`;
    const isWolf = eliminatedRole === "Loup-Garou" || eliminatedRole === "Loup Alpha";
    if (isWolf) recap += "LE VILLAGE A TROUVÉ UN LOUP.\n";
    else recap += "LE VILLAGE S'EST TROMPÉ.\n";
  }

  recap += "DÉTAIL DES VOTES :\n";
  for (const v of voteReveals) {
    recap += `- ${v.voter} → ${v.target}${v.reason ? ` ("${v.reason}")` : ""}\n`;
  }
  const blanks = voteReveals.filter((v) => v.target === "BLANC" || v.target === "abstention");
  if (blanks.length > 0) {
    recap += `VOTES BLANCS : ${blanks.map((v) => v.voter).join(", ")}\n`;
  }

  return recap;
}

/** Build recap after night (for active roles) */
export function buildNightRecap(
  cycle: number,
  player: Player,
  nightResult: NightResult,
  seerLog: SeerEntry[],
  potions: Potions,
): string {
  let recap = `PHASE : Nuit ${cycle}\n`;

  if (isWolfRole(player.role)) {
    if (nightResult.wolfTarget) {
      const saved = nightResult.saved ? " Résultat : sauvé (Sorcière ou Salvateur)" : " Résultat : mort";
      recap += `VOTRE CIBLE : ${nightResult.wolfTarget}.${saved}\n`;
    }
    if (nightResult.alphaConverted) {
      recap += `CONVERSION ALPHA : ${nightResult.alphaConverted} a été converti en Loup.\n`;
    }
  }

  if (player.role === "Voyante") {
    const latestInspection = seerLog.filter((s) => s.cycle === cycle);
    for (const s of latestInspection) {
      recap += `INSPECTION : ${s.target} est ${s.result}.\n`;
    }
  }

  if (player.role === "Sorcière") {
    if (nightResult.saved) {
      recap += `TU AS sauvé ${nightResult.wolfTarget}. `;
    }
    recap += `Potions restantes : guérison=${potions.heal ? "oui" : "non"}, poison=${potions.poison ? "oui" : "non"}\n`;
  }

  return recap;
}

// ── JOURNAL COMPRESSION ──────────────────────────────────────────────────

/** Extract player names from a text string */
function extractNames(text: string, players: Player[]): string {
  const alive = players.filter((p) => p.alive).map((p) => p.name);
  const found = alive.filter((name) => text.toLowerCase().includes(name.toLowerCase()));
  return found.join(", ") || "aucun";
}

/** Format a single journal entry for display */
function formatEntry(entry: JournalEntry): string {
  let text = `[${entry.phase}]\n`;
  text += `OBSERVATIONS : ${entry.observations}\n`;
  text += `ANALYSE : ${entry.analysis}\n`;
  text += `SOUPÇONS : ${entry.suspicions}\n`;
  text += `ALLIANCES : ${entry.alliances}\n`;
  text += `MENACES : ${entry.threats}\n`;
  text += `STRATÉGIE : ${entry.strategy}`;
  return text;
}

/** Compress journal if it exceeds token threshold.
 *  Keeps last 3 entries full, summarizes older ones. */
export function compressJournal(entries: JournalEntry[], players: Player[]): string {
  if (entries.length === 0) return "(Aucune entrée)";
  if (entries.length <= 3) {
    return entries.map((e) => formatEntry(e)).join("\n---\n");
  }

  const oldEntries = entries.slice(0, -3);
  const recentEntries = entries.slice(-3);

  const compressed = oldEntries
    .map(
      (e) =>
        `${e.phase} : soupçons=${extractNames(e.suspicions, players)}, alliances=${extractNames(e.alliances, players)}, stratégie=${e.strategy.substring(0, 50)}`
    )
    .join("\n");

  const recent = recentEntries.map((e) => formatEntry(e)).join("\n---\n");

  return `RÉSUMÉ ANCIEN :\n${compressed}\n\nENTRÉES RÉCENTES :\n${recent}`;
}

// ── JOURNAL FORMATTING FOR CONTEXT INJECTION ─────────────────────────────

/** Format full journal for debate context — replaces gameMemory */
export function formatJournalForContext(entries: JournalEntry[], players: Player[]): string {
  if (entries.length === 0) return "";
  const journalText = compressJournal(entries, players);
  return `TON JOURNAL INTERNE (tes réflexions privées, personne d'autre ne les voit) :
---
${journalText}
---

Utilise ton journal pour guider ton intervention. Tes soupçons, tes alliances, ta stratégie sont dedans. Ne répète pas le journal à voix haute — utilise-le pour SAVOIR ce que tu penses, puis parle naturellement.`;
}

/** Format suspicions summary for vote context */
export function formatSuspicionsForVote(entries: JournalEntry[]): string {
  if (entries.length === 0) return "";
  const suspicionLines = entries
    .filter((e) => e.suspicions.trim().length > 0)
    .map((e) => `${e.phase} : ${e.suspicions}`);
  if (suspicionLines.length === 0) return "";
  return `TON JOURNAL — RÉSUMÉ DE TES SOUPÇONS :
${suspicionLines.join("\n")}

Vote en cohérence avec tes soupçons. Si tu suspectes quelqu'un depuis 2 jours, c'est le moment de voter contre lui.`;
}

/** Format strategy summary for night context */
export function formatStrategyForNight(entries: JournalEntry[]): string {
  if (entries.length === 0) return "";
  const stratLines = entries
    .filter((e) => e.strategy.trim().length > 0 || e.threats.trim().length > 0)
    .slice(-3)
    .map((e) => {
      let line = `${e.phase} :`;
      if (e.strategy) line += ` Stratégie: ${e.strategy}`;
      if (e.threats) line += ` Menaces: ${e.threats}`;
      return line;
    });
  if (stratLines.length === 0) return "";
  return `TON JOURNAL — TA STRATÉGIE :
${stratLines.join("\n")}

Agis en cohérence avec ta stratégie. Si tu avais prévu de cibler quelqu'un cette nuit, fais-le.`;
}

// ── JOURNAL UPDATE PROMPT ────────────────────────────────────────────────

/** Build the system prompt for journal update (just personality + role, cacheable) */
export function buildJournalSystemPrompt(player: Player): string {
  return `Tu es ${player.name} (${player.gender === "elle" ? "elle" : "il"}). Rôle secret : ${player.role}. Tu mets à jour ton journal interne.`;
}

/** Build the user message for journal update */
export function buildJournalUserMessage(
  playerName: string,
  currentJournal: JournalEntry[],
  phaseDescription: string,
  phaseSummary: string,
  players: Player[],
): string {
  const journalText = currentJournal.length > 0
    ? compressJournal(currentJournal, players)
    : "(Première entrée — journal vide)";

  return `Tu es ${playerName}. Voici ton journal interne jusqu'ici :
---
${journalText}
---

CE QUI VIENT DE SE PASSER (${phaseDescription}) :
${phaseSummary}

METS À JOUR ton journal. Écris une nouvelle entrée structurée :

OBSERVATIONS : (faits purs — qui a dit quoi, qui est mort, qui a voté qui)
ANALYSE : (ton interprétation personnelle — qu'est-ce que ça signifie selon toi ?)
SOUPÇONS : (qui tu suspectes maintenant, avec une note de confiance : fort/moyen/faible. Qui est monté dans tes soupçons ? Qui est descendu ? Pourquoi ?)
ALLIANCES : (qui tu considères comme fiable, qui tu veux protéger, avec qui tu veux collaborer)
MENACES : (qui est dangereux pour toi personnellement — quelqu'un t'a accusé ? quelqu'un semble avoir des infos sur toi ?)
STRATÉGIE : (qu'est-ce que tu comptes faire au prochain tour ? accuser quelqu'un ? te défendre ? observer ? changer de cible ?)

Sois CONCIS. Max 150 mots pour l'entrée complète. C'est un carnet de notes rapide, pas un essai.`;
}

/** Parse a journal entry from AI response text */
export function parseJournalEntry(raw: string, phase: string): JournalEntry {
  const extract = (label: string): string => {
    const pattern = new RegExp(`${label}\\s*:\\s*(.+?)(?=\\n(?:OBSERVATIONS|ANALYSE|SOUPÇONS|ALLIANCES|MENACES|STRATÉGIE)\\s*:|$)`, "si");
    const match = raw.match(pattern);
    return match ? match[1].trim() : "";
  };

  return {
    phase,
    observations: extract("OBSERVATIONS") || "Rien de notable.",
    analysis: extract("ANALYSE") || "",
    suspicions: extract("SOUPÇONS") || "Aucun soupçon.",
    alliances: extract("ALLIANCES") || "",
    threats: extract("MENACES") || "",
    strategy: extract("STRATÉGIE") || "Observer.",
  };
}
