import type { Player, PlayerIdentity, Role, WolfStyle, Gender, GameConfig, RoleCard } from "@/types/game";

// ── ARCHÉTYPES IA ──────────────────────────────────────────────────────────

/** Archétypes de personnalité IA. Le nom est cosmétique et tiré au sort ;
 *  la personnalité (clé = archetype) est fixe et liée au slot. */
export const ARCHETYPES: { archetype: string; emoji: string; color: string; gender: "il" | "elle" }[] = [
  { archetype: "Marguerite", emoji: "🌸", color: "#e8a0bf", gender: "elle" },
  { archetype: "Victor",     emoji: "🔥", color: "#e8743a", gender: "il" },
  { archetype: "Camille",    emoji: "🔮", color: "#7eb8da", gender: "elle" },
  { archetype: "Hugo",       emoji: "🌿", color: "#6bbf6b", gender: "il" },
  { archetype: "Basile",     emoji: "🪨", color: "#9e9e9e", gender: "il" },
  { archetype: "Roxane",     emoji: "⚔️", color: "#d94f4f", gender: "elle" },
  { archetype: "Lucie",      emoji: "🌙", color: "#c4a0d4", gender: "elle" },
  { archetype: "Armand",     emoji: "🎖️", color: "#a08858", gender: "il" },
  { archetype: "Noémie",     emoji: "🎭", color: "#e07baf", gender: "elle" },
  { archetype: "Sacha",      emoji: "🧊", color: "#6ec6d4", gender: "il" },
  { archetype: "Élise",      emoji: "🫶", color: "#e8a8c0", gender: "elle" },
  { archetype: "Théo",       emoji: "😈", color: "#c47a3a", gender: "il" },
  { archetype: "Inès",       emoji: "🕶️", color: "#8a7abf", gender: "elle" },
  { archetype: "Gabriel",    emoji: "📎", color: "#8bc48b", gender: "il" },
];

// ── POOLS DE PRÉNOMS ──────────────────────────────────────────────────────

const MASCULINE_NAMES = [
  "Antoine", "Bastien", "Clément", "Damien", "Étienne",
  "Florian", "Gauthier", "Henri", "Ismaël", "Julien",
  "Kylian", "Léo", "Mathis", "Nathan", "Olivier",
  "Paul", "Quentin", "Raphaël", "Sébastien", "Thomas",
  "Ugo", "Valentin", "William", "Xavier", "Yann",
  "Zacharie", "Adrien", "Bruno", "César", "Diego",
  "Émile", "Fabien", "Grégoire", "Hadrien", "Ivan",
  "Jérôme", "Kevin", "Luca", "Maxime", "Noé",
  "Oscar", "Pierre", "Rémi", "Simon", "Tristan",
  "Aurélien", "Benoît", "Côme", "Denis", "Éric",
];

const FEMININE_NAMES = [
  "Anaïs", "Bérénice", "Clara", "Diane", "Élodie",
  "Flore", "Gaëlle", "Hélène", "Iris", "Jade",
  "Katia", "Léonie", "Manon", "Nina", "Océane",
  "Pauline", "Rose", "Sarah", "Tessa", "Ursule",
  "Victoire", "Wendy", "Yasmine", "Zoé", "Agathe",
  "Brune", "Céleste", "Daphné", "Estelle", "Fanny",
  "Gwendoline", "Honorine", "Inaya", "Joséphine", "Lina",
  "Margaux", "Nora", "Ophélie", "Pénélope", "Romane",
  "Solène", "Tatiana", "Valentine", "Ambre", "Blanche",
  "Charline", "Delphine", "Eva", "Faustine", "Gabrielle",
];

/** Build human identity with the chosen name */
export function makeHumanIdentity(name: string): PlayerIdentity {
  return { name, emoji: "🧑", color: "#d4a843", gender: "il", isHuman: true };
}

// ── CATALOGUE DES RÔLES ────────────────────────────────────────────────────

export const ROLE_CATALOG: RoleCard[] = [
  { role: "Loup-Garou",       label: "Loup-Garou",       emoji: "🐺", camp: "loups",   description: "Chaque nuit, les loups choisissent une victime.",                           minPlayers: 8,  alwaysActive: true },
  { role: "Villageois",       label: "Villageois",       emoji: "👤", camp: "village",  description: "Observation et argumentation. Le rôle le plus courant.",                    minPlayers: 8,  alwaysActive: true },
  { role: "Voyante",          label: "Voyante",          emoji: "🔮", camp: "village",  description: "Chaque nuit, découvre le rôle exact d'un joueur.",                          minPlayers: 8,  defaultActive: true },
  { role: "Sorcière",         label: "Sorcière",         emoji: "🧪", camp: "village",  description: "2 potions : guérison (sauve) et poison (tue). Usage unique.",               minPlayers: 8,  defaultActive: true },
  { role: "Chasseur",         label: "Chasseur",         emoji: "🎯", camp: "village",  description: "S'il meurt, il désigne un joueur qui meurt avec lui.",                      minPlayers: 8,  defaultActive: true },
  { role: "Cupidon",          label: "Cupidon",          emoji: "💘", camp: "village",  description: "La première nuit, crée 2 Amoureux. Si l'un meurt, l'autre aussi.",          minPlayers: 10 },
  { role: "Ancien",           label: "Ancien",           emoji: "🛡️", camp: "village",  description: "Résiste à la première attaque des loups. Éliminé par vote = perte pouvoirs.", minPlayers: 10 },
  { role: "Salvateur",        label: "Salvateur",        emoji: "🔒", camp: "village",  description: "Chaque nuit, protège un joueur. Pas le même 2 nuits de suite.",             minPlayers: 10 },
  { role: "Corbeau",          label: "Corbeau",          emoji: "🐦", camp: "village",  description: "Chaque nuit, désigne un joueur qui commence le vote avec +2 voix.",         minPlayers: 10 },
  { role: "Idiot du Village", label: "Idiot du Village", emoji: "🤪", camp: "village",  description: "Voté = survit mais perd le droit de vote.",                                  minPlayers: 10 },
  { role: "Petite Fille",     label: "Petite Fille",     emoji: "👧", camp: "village",  description: "Espionne les loups (50% voir 1 loup, 20% être repérée et mourir).",         minPlayers: 12 },
  { role: "Loup Alpha",       label: "Loup Alpha",       emoji: "🐺👑", camp: "loups",  description: "Une fois par partie, peut convertir un villageois en loup.",                minPlayers: 12, replacesWolf: true },
];

// ── PRESETS ─────────────────────────────────────────────────────────────────

export function getPreset(name: string): GameConfig {
  switch (name) {
    case "classique":
      return {
        playerCount: 8, wolfCount: 2, preset: "classique",
        roles: ["Loup-Garou", "Loup-Garou", "Voyante", "Sorcière", "Chasseur", "Villageois", "Villageois", "Villageois"],
      };
    case "étendu":
      return {
        playerCount: 10, wolfCount: 2, preset: "étendu",
        roles: ["Loup-Garou", "Loup-Garou", "Voyante", "Sorcière", "Chasseur", "Cupidon", "Ancien", "Villageois", "Villageois", "Villageois"],
      };
    case "intense":
      return {
        playerCount: 12, wolfCount: 3, preset: "intense",
        roles: ["Loup-Garou", "Loup-Garou", "Loup-Garou", "Voyante", "Sorcière", "Chasseur", "Cupidon", "Salvateur", "Corbeau", "Villageois", "Villageois", "Villageois"],
      };
    case "chaos":
      return {
        playerCount: 15, wolfCount: 3, preset: "chaos",
        roles: [
          "Loup-Garou", "Loup-Garou", "Loup Alpha",
          "Voyante", "Sorcière", "Chasseur", "Cupidon", "Salvateur", "Ancien",
          "Petite Fille", "Corbeau", "Idiot du Village",
          "Villageois", "Villageois", "Villageois",
        ],
      };
    default:
      return getPreset("classique");
  }
}

/** Calculate wolf count from player count */
export function getWolfCount(playerCount: number): number {
  if (playerCount <= 10) return 2;
  if (playerCount <= 14) return 3;
  return 3; // 15 players default
}

/** Build roles array from config selection */
export function buildRolesFromConfig(
  playerCount: number,
  selectedRoles: Role[],
  wolfCount: number
): Role[] {
  const roles: Role[] = [];

  // Add wolves
  const hasAlpha = selectedRoles.includes("Loup Alpha");
  const standardWolves = hasAlpha ? wolfCount - 1 : wolfCount;
  for (let i = 0; i < standardWolves; i++) roles.push("Loup-Garou");
  if (hasAlpha) roles.push("Loup Alpha");

  // Add special village roles
  const specialVillage = selectedRoles.filter(
    (r) => r !== "Loup-Garou" && r !== "Loup Alpha" && r !== "Villageois"
  );
  specialVillage.forEach((r) => roles.push(r));

  // Fill remaining with Villageois
  const remaining = playerCount - roles.length;
  for (let i = 0; i < remaining; i++) roles.push("Villageois");

  return roles;
}

// ── ASSIGNMENT ──────────────────────────────────────────────────────────────

const WOLF_STYLES_POOL: WolfStyle[] = ["contributeur", "suiveur", "accusateur"];

/** Référence statique pour la révélation finale des rôles */
export let INITIAL_PLAYERS: Omit<Player, "alive" | "revealedRole">[] = [];

/** Pioche un nom aléatoire dans le pool du bon genre, sans doublon */
function drawName(gender: "il" | "elle", usedNames: Set<string>): string {
  const pool = gender === "il" ? MASCULINE_NAMES : FEMININE_NAMES;
  const available = pool.filter((n) => !usedNames.has(n));
  if (available.length === 0) return pool[Math.floor(Math.random() * pool.length)];
  return available[Math.floor(Math.random() * available.length)];
}

/** Génère les joueurs avec rôles aléatoires selon la config */
export function getInitialPlayers(config?: GameConfig): Player[] {
  const cfg = config || getPreset("classique");
  const aiCount = cfg.playerCount - 1; // -1 for human

  // Human identity
  const humanName = cfg.humanName?.trim() || "Joueur";
  const humanIdentity = makeHumanIdentity(humanName);
  const usedNames = new Set<string>([humanName]);

  // Pick random AI archetypes
  const shuffledArchetypes = shuffle([...ARCHETYPES]);
  const selectedArchetypes = shuffledArchetypes.slice(0, aiCount);

  // Build AI identities with random names
  const aiIdentities: PlayerIdentity[] = selectedArchetypes.map((a) => {
    const name = drawName(a.gender, usedNames);
    usedNames.add(name);
    return {
      name,
      emoji: a.emoji,
      color: a.color,
      gender: a.gender,
      archetype: a.archetype,
    };
  });

  // Combine all identities (human + AIs)
  const allIdentities: PlayerIdentity[] = [humanIdentity, ...aiIdentities];

  // Shuffle roles
  const shuffledRoles = shuffle([...cfg.roles]);
  const shuffledWolfStyles = shuffle([...WOLF_STYLES_POOL]);
  let wolfIdx = 0;

  const players: Player[] = allIdentities.map((identity, i) => {
    const role = shuffledRoles[i];
    const isWolf = role === "Loup-Garou" || role === "Loup Alpha";
    const wolfStyle = isWolf ? shuffledWolfStyles[wolfIdx++ % shuffledWolfStyles.length] : undefined;
    return {
      ...identity,
      role,
      wolfStyle,
      alive: true,
      revealedRole: false,
    };
  });

  INITIAL_PLAYERS = players.map(({ alive: _a, revealedRole: _r, ...rest }) => rest);
  return players;
}

// ── LOGIQUE DE JEU ─────────────────────────────────────────────────────────

/** Mélange un tableau (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

/** Trouve un joueur par prénom (insensible à la casse) */
export function findPlayer(players: Player[], name: string | null): Player | null {
  if (!name) return null;
  return players.find(
    (p) => p.name.toLowerCase() === name.toLowerCase().trim()
  ) ?? null;
}

/** Check if a role is wolf-team */
export function isWolfRole(role: Role): boolean {
  return role === "Loup-Garou" || role === "Loup Alpha";
}

/** Vérifie les conditions de victoire */
export function checkWin(
  players: Player[],
  lovers?: { player1: string; player2: string; isMixedCouple: boolean } | null
): "village" | "loups" | "couple" | null {
  const alive = players.filter((p) => p.alive);

  // Mixed couple win: only the 2 lovers are alive
  if (lovers?.isMixedCouple) {
    const lover1Alive = alive.find((p) => p.name === lovers.player1);
    const lover2Alive = alive.find((p) => p.name === lovers.player2);
    if (lover1Alive && lover2Alive && alive.length === 2) {
      return "couple";
    }
  }

  const wolves = alive.filter((p) => isWolfRole(p.role));
  const villagers = alive.length - wolves.length;
  if (wolves.length === 0) return "village";
  if (wolves.length >= villagers) return "loups";
  return null;
}

/** Parse le nom depuis une réponse formatée (CIBLE: X, VOTE: X, etc.) */
export function parseName(text: string, keyword: string): string | null {
  const match = text.match(new RegExp(`${keyword}:\\s*([A-Za-zÀ-ÿ]+)`, "i"));
  return match ? match[1] : null;
}

/** Parse l'action de la sorcière depuis la réponse IA */
export function parseWitchAction(text: string): string | null {
  const match = text.match(
    /ACTION:\s*(SAUVER|EMPOISONNER\s+[A-Za-zÀ-ÿ]+|RIEN)/i
  );
  return match ? match[1].trim() : null;
}

/** Détermine si le joueur humain est mort */
export function isHumanDead(players: Player[]): boolean {
  const human = players.find((p) => p.isHuman);
  return !!human && !human.alive;
}

/** Calcul du tally de votes et détermination de l'éliminé */
export function computeVoteResult(
  aiVotes: Record<string, string>,
  humanVote: string | null,
  corbeauTarget?: string | null
): { eliminated: string | null; tie: boolean } {
  const tally: Record<string, number> = {};

  // Corbeau bonus: +2 votes against target
  if (corbeauTarget) {
    tally[corbeauTarget] = (tally[corbeauTarget] || 0) + 2;
  }

  if (humanVote && humanVote !== "abstention" && humanVote !== "BLANC") {
    tally[humanVote] = (tally[humanVote] || 0) + 1;
  }

  Object.values(aiVotes).forEach((target) => {
    if (target && target !== "abstention" && target !== "BLANC") {
      tally[target] = (tally[target] || 0) + 1;
    }
  });

  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) return { eliminated: null, tie: true };

  const tie = sorted.length > 1 && sorted[0][1] === sorted[1][1];

  return {
    eliminated: tie ? null : sorted[0][0],
    tie,
  };
}

/** Noms féminins pour accorder les messages — cherche dans les joueurs courants */
export function isFeminine(name: string, players?: Player[]): boolean {
  if (players) {
    const p = players.find((pl) => pl.name === name);
    if (p) return p.gender === "elle";
  }
  // Fallback: check in INITIAL_PLAYERS
  const ip = INITIAL_PLAYERS.find((p) => p.name === name);
  return ip?.gender === "elle";
}

/** Get emoji for a role */
export function roleEmoji(role: Role): string {
  const card = ROLE_CATALOG.find((c) => c.role === role);
  return card?.emoji || "👤";
}

/** Get display label for a role (shortened for UI) */
export function roleLabel(role: Role): string {
  if (role === "Loup-Garou") return "🐺 Loup";
  if (role === "Loup Alpha") return "🐺👑 Alpha";
  if (role === "Idiot du Village") return "🤪 Idiot";
  if (role === "Petite Fille") return "👧 P.Fille";
  return role;
}
