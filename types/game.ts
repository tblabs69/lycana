export type Role =
  | "Loup-Garou"
  | "Loup Alpha"
  | "Voyante"
  | "Sorcière"
  | "Chasseur"
  | "Cupidon"
  | "Ancien"
  | "Salvateur"
  | "Petite Fille"
  | "Corbeau"
  | "Idiot du Village"
  | "Villageois";

export type WolfStyle = "contributeur" | "suiveur" | "accusateur";
export type Gender = "il" | "elle";

export type Phase =
  | "config"
  | "intro"
  | "night"
  | "dawn"
  | "debate"
  | "humanTurn"
  | "roundTransition"
  | "voteHuman"
  | "voteAI"
  | "voteAuto"
  | "humanNight"
  | "hunterShot"
  | "loveChat"
  | "gameOver";

export interface PlayerIdentity {
  name: string;
  emoji: string;
  color: string;
  gender: Gender;
  isHuman?: boolean;
  /** Archetype key — maps to PERSONALITIES in prompts.ts */
  archetype?: string;
}

export type DeathCause = "vote" | "wolves" | "hunter" | "witch" | "love" | "petiteFille" | null;

export interface Player extends PlayerIdentity {
  role: Role;
  wolfStyle?: WolfStyle;
  alive: boolean;
  revealedRole: boolean;
  /** Ancien: already survived one wolf attack */
  ancienUsed?: boolean;
  /** Idiot: survived vote but lost voting rights */
  idiotRevealed?: boolean;
  /** Loup Alpha: conversion power used */
  alphaUsed?: boolean;
  /** AI internal journal — persistent memory across phases */
  internalJournal?: JournalEntry[];
  /** Cause of death — set when player dies */
  causeOfDeath?: DeathCause;
  /** Future: persistent character ID across games */
  characterId?: string;
}

export interface Message {
  text: string;
  isSystem?: boolean;
  speaker?: string;
  emoji?: string;
  color?: string;
  isHuman?: boolean;
  cycle?: number;
  isNight?: boolean;
  isDawn?: boolean;
  isVictory?: boolean;
  isCycleSep?: boolean;
}

export interface SeerEntry {
  target: string;
  result: string; // exact role name, e.g. "Loup-Garou", "Sorcière", "Villageois"
  cycle: number;
}

export interface NightResult {
  wolfTarget: string | null;
  saved: boolean;
  deaths: Player[];
  salvateurTarget?: string | null;
  corbeauTarget?: string | null;
  petiteFilleResult?: { saw: string | null; caught: boolean } | null;
  alphaConverted?: string | null;
  loversFormed?: [string, string] | null;
}

export interface HistoryEntry {
  cycle: number;
  nightDeaths: string[]; // all night deaths (wolf + poison + petite fille + lover)
  nightDeath: string | null; // primary wolf target (kept for backwards compat)
  voteDeath: string | null;
  voteRole: string | null;
  hunterDeath: string | null;
}

export interface NotableAccusation {
  cycle: number;
  accuserName: string;
  targetName: string;
  strength: "strong" | "moderate";
  summary: string; // short description of what was said
  accuserDiedSameCycle: boolean;
  accuserRole?: string; // revealed after death
}

export interface VoteReveal {
  voter: string;
  target: string;
  reason: string;
  isHuman?: boolean;
}

export interface Potions {
  heal: boolean;
  poison: boolean;
}

export interface Lovers {
  player1: string;
  player2: string;
  isMixedCouple: boolean; // one wolf + one village
  coupleKnowsMixedStatus?: boolean; // true if both lovers revealed roles to each other
}

// ── GAME CONFIG ────────────────────────────────────────────────────────────

export interface GameConfig {
  playerCount: number;
  wolfCount: number;
  roles: Role[];
  preset: "classique" | "étendu" | "intense" | "chaos" | "personnalisé";
  humanName?: string;
  byokKey?: string;
}

export interface RoleCard {
  role: Role;
  label: string;
  emoji: string;
  camp: "village" | "loups";
  description: string;
  minPlayers: number;
  alwaysActive?: boolean;
  defaultActive?: boolean;
  replacesWolf?: boolean; // Loup Alpha replaces a standard wolf
}

// ── API TYPES ──────────────────────────────────────────────────────────────

export interface DebateRequest {
  player: Player;
  players: Player[];
  messages: Message[];
  cycle: number;
  round: number;
  nightResult: NightResult | null;
  history: HistoryEntry[];
  seerLog: SeerEntry[];
  lovers?: Lovers | null;
  directive?: string;
  notableAccusations?: NotableAccusation[];
}

export interface DebateResponse {
  text: string;
}

export interface VoteRequest {
  player: Player;
  players: Player[];
  messages: Message[];
  cycle: number;
  contrarian?: boolean;
  lovers?: Lovers | null;
}

export interface VoteResponse {
  target: string;
  reason: string;
}

export interface NightRequest {
  players: Player[];
  cycle: number;
  seerLog: SeerEntry[];
  potions: Potions;
  lovers?: Lovers | null;
  salvateurLastTarget?: string | null;
  messages?: Message[];
  history?: HistoryEntry[];
}

export interface NightResponse {
  wolfTarget: string | null;
  wolfReason?: string | null;
  seerTarget: string | null;
  seerResult: string | null; // exact role
  witchAction: string | null;
  salvateurTarget?: string | null;
  corbeauTarget?: string | null;
  petiteFilleResult?: { saw: string | null; caught: boolean } | null;
  alphaConverted?: string | null;
  loversFormed?: [string, string] | null;
}

export interface HunterRequest {
  hunter: Player;
  players: Player[];
  messages?: Message[];
  history?: HistoryEntry[];
  cycle?: number;
}

export interface HunterResponse {
  target: string;
}

export type NarratorTransition =
  | "nightFalls"
  | "dawn"
  | "debateStart"
  | "round2"
  | "voteResult"
  | "gameOver";

export interface NarratorRequest {
  transition: NarratorTransition;
  cycle: number;
  players: Player[];
  context: Record<string, unknown>;
}

export interface NarratorResponse {
  text: string;
}

// ── LOVE CHAT TYPES ──────────────────────────────────────────────────────

export interface LoveChatRequest {
  player: Player;
  partnerName: string;
  humanMessage?: string; // present when human sends a message to AI lover
  lovers: Lovers;
  cycle: number;
}

export interface LoveChatResponse {
  text: string;
  revealedRole?: boolean; // true if the AI revealed their role in the message
}

// ── INTERNAL JOURNAL (AI memory) ──────────────────────────────────────────

export interface JournalEntry {
  phase: string;        // "nuit-1", "jour-1-tour1", "jour-1-tour2", "vote-1", "nuit-2", etc.
  observations: string; // Factual observations
  analysis: string;     // Personal interpretation
  suspicions: string;   // Who they suspect and why (fort/moyen/faible)
  alliances: string;    // Who they consider allies
  threats: string;      // Who is dangerous to them personally
  strategy: string;     // Next steps
}

export interface JournalUpdateRequest {
  playerId: string;
  playerName: string;
  role: string;
  archetype: string;
  currentJournal: JournalEntry[];
  phaseDescription: string;
  phaseSummary: string;
}

export interface JournalUpdateResponse {
  entry: JournalEntry;
}

// ── GAME SUMMARY (for future Supabase persistence) ──────────────────────

export interface GameSummary {
  playerCount: number;
  humanRole: string;
  result: "village_win" | "wolves_win";
  humanSurvived: boolean;
  cycles: number;
  provider: string;
  characters: {
    name: string;
    personality: string;
    role: string;
    survived: boolean;
    accusedHuman: boolean;
    defendedHuman: boolean;
    votedAgainstHuman: boolean;
  }[];
}
