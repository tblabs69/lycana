import Anthropic from "@anthropic-ai/sdk";
import { debugLog } from "@/lib/debug";

// Singleton client for server API key — instancié une seule fois
let _client: Anthropic | null = null;

function getDefaultClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _client;
}

/** Returns a client using the BYOK key if provided, otherwise the server key */
export function getAnthropicClient(byokKey?: string): Anthropic {
  if (byokKey) {
    // BYOK: create a fresh client with the user's key (not cached)
    return new Anthropic({ apiKey: byokKey });
  }
  return getDefaultClient();
}

// ── TOKEN TRACKING ──────────────────────────────────────────────────────
interface TokenStats {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
}

const _stats: TokenStats = { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0 };

function trackUsage(usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number }) {
  _stats.calls++;
  _stats.inputTokens += usage.input_tokens;
  _stats.outputTokens += usage.output_tokens;
  _stats.cacheReadTokens += usage.cache_read_input_tokens || 0;
  _stats.cacheCreateTokens += usage.cache_creation_input_tokens || 0;
}

/** Haiku 4.5 pricing (per 1M tokens) */
const PRICING = {
  input: 0.80,        // $0.80 / 1M input
  output: 4.00,       // $4.00 / 1M output
  cacheWrite: 1.00,   // $1.00 / 1M cache write
  cacheRead: 0.08,    // $0.08 / 1M cache read
};

export function getTokenStats() { return { ..._stats }; }

export function resetTokenStats() {
  _stats.calls = 0;
  _stats.inputTokens = 0;
  _stats.outputTokens = 0;
  _stats.cacheReadTokens = 0;
  _stats.cacheCreateTokens = 0;
}

export function logGameCost() {
  const inputCost = (_stats.inputTokens / 1_000_000) * PRICING.input;
  const outputCost = (_stats.outputTokens / 1_000_000) * PRICING.output;
  const cacheWriteCost = (_stats.cacheCreateTokens / 1_000_000) * PRICING.cacheWrite;
  const cacheReadCost = (_stats.cacheReadTokens / 1_000_000) * PRICING.cacheRead;
  const total = inputCost + outputCost + cacheWriteCost + cacheReadCost;
  const totalCacheTokens = _stats.cacheReadTokens + _stats.cacheCreateTokens;
  const cacheHitRate = totalCacheTokens > 0 ? Math.round((_stats.cacheReadTokens / totalCacheTokens) * 100) : 0;

  debugLog(`\n=== FIN DE PARTIE ===`);
  debugLog(`Appels API     : ${_stats.calls}`);
  debugLog(`Tokens input   : ${_stats.inputTokens.toLocaleString()} (dont ${_stats.cacheReadTokens.toLocaleString()} cache_read)`);
  debugLog(`Tokens output  : ${_stats.outputTokens.toLocaleString()}`);
  debugLog(`Cache hit rate : ${cacheHitRate}%`);
  debugLog(`Coût estimé    : $${total.toFixed(4)}`);
  debugLog(`  - Input      : $${inputCost.toFixed(4)}`);
  debugLog(`  - Output     : $${outputCost.toFixed(4)}`);
  debugLog(`  - Cache write: $${cacheWriteCost.toFixed(4)}`);
  debugLog(`  - Cache read : $${cacheReadCost.toFixed(4)}`);
  debugLog(`====================\n`);

  return {
    total, calls: _stats.calls,
    inputTokens: _stats.inputTokens, outputTokens: _stats.outputTokens,
    cacheReadTokens: _stats.cacheReadTokens, cacheCreateTokens: _stats.cacheCreateTokens,
    cacheHitRate,
  };
}

// Modèles recommandés par rôle
export const MODELS = {
  wolves: "claude-haiku-4-5-20251001",   // Loups : bluff exigeant
  seer: "claude-haiku-4-5-20251001",     // Voyante : gestion d'info privée
  witch: "claude-haiku-4-5-20251001",    // Sorcière
  hunter: "claude-haiku-4-5-20251001",  // Chasseur
  villager: "claude-haiku-4-5-20251001", // Villageois : suffisant, moins cher
  narrator: "claude-haiku-4-5-20251001", // Narrateur : simple
} as const;

// Température recommandée par rôle
export const TEMPERATURES = {
  villager: 0.8,
  wolf: 0.6,
  narrator: 0.7,
} as const;

/**
 * Appel Claude avec prompt caching sur le system prompt.
 * Le system prompt (personnalité + rôle) est stable → cachable.
 * Le contexte dynamique (historique débat, état du jeu) va dans le message user.
 */
export async function callClaude({
  systemPrompt,
  userMessage,
  model = "claude-haiku-4-5-20251001",
  maxTokens = 200,
  temperature = 0.8,
  prefill,
  byokKey,
}: {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  prefill?: string;
  byokKey?: string;
}): Promise<string> {
  const client = getAnthropicClient(byokKey);

  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: userMessage },
  ];
  // Prefill: prime the assistant's response to avoid reasoning dumps
  if (prefill) {
    messages.push({ role: "assistant", content: prefill });
  }

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    stream: false,
    system: [
      {
        type: "text",
        text: systemPrompt,
        // Le system prompt est identique à chaque appel pour un même joueur → cachable
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const usage = response.usage as {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  trackUsage(usage);
  // Log context size (chars → ~tokens/4) + cache hit info
  const ctxChars = systemPrompt.length + userMessage.length;
  debugLog(`[API] ${model} | input: ${usage.input_tokens} | cache_read: ${usage.cache_read_input_tokens || 0} | cache_create: ${usage.cache_creation_input_tokens || 0} | output: ${usage.output_tokens} | ctx_chars: ${ctxChars}`);

  const content = response.content[0];
  if (content.type !== "text") return "...";
  return content.text;
}

/** Nettoie la réponse IA avant affichage :
 *  - Supprime les tags <think>/<speak> résiduels
 *  - Supprime le markdown et les astérisques d'action
 *  - Enlève le préfixe "Nom: " en début de réponse
 *  - Supprime les didascalies (descriptions d'actions physiques)
 *  - Remplace les tirets cadratins par des virgules
 *  - Supprime les participes traînants
 */
export function cleanResponse(text: string, playerName?: string): string {
  let t = text.trim();

  // Safety net: strip any residual <think>/<speak> tags that survived extraction
  t = t.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  t = t.replace(/<\/?think>/g, "").replace(/<\/?speak>/g, "").trim();

  // Strip reasoning dumps: sentences that are internal analysis, not speech
  // These patterns indicate the model is "thinking out loud" instead of speaking in character
  const REASONING_PATTERNS = [
    /^[^.!?]*\b(?:Je suis (?:un |le )?(?:Loup|loup|Voyante|Sorcière|Chasseur|Salvateur|Cupidon|Ancien|Corbeau|Villageois))\b[^.!?]*[.!?]\s*/i,
    /^[^.!?]*\b(?:C'est le tour \d|C'est le cycle|Tour \d|Cycle \d)\b[^.!?]*[.!?]\s*/i,
    /^[^.!?]*\b(?:Je dois|Ma stratégie|Mon angle|Mon objectif|Je ne dois pas|Il faut que je)\b[^.!?]*[.!?]\s*/i,
    /^[^.!?]*\b(?:Qui je suspecte|Qu'est-ce que je sais|Quelle est ma stratégie)\b[^.!?]*[.!?]\s*/i,
    /^[^.!?]*\b(?:était notre cible|était ma cible|mon co(?:é|e)quipier)\b[^.!?]*[.!?]\s*/i,
    /^[^.!?]*\b(?:Personne n'est mort =|soit la Sorcière|soit le Salvateur|cible invalide)\b[^.!?]*[.!?]\s*/i,
    /^[^.!?]*\b(?:Je peux (?:accuser|défendre|observer|tester|semer)|Je vais (?:accuser|défendre|observer|tester))\b[^.!?]*[.!?]\s*/i,
    /^[^.!?]*\b(?:La directive|Cette directive|Directive :)\b[^.!?]*[.!?]\s*/i,
  ];

  // Repeatedly strip reasoning sentences from the start of the text
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of REASONING_PATTERNS) {
      const before = t;
      t = t.replace(pattern, "").trim();
      if (t !== before) {
        changed = true;
        break; // restart loop after each strip
      }
    }
  }

  // Also strip bullet-point style reasoning lines (- text\n patterns at the start)
  t = t.replace(/^(?:\s*[-•]\s+[^\n]+\n?)+/g, "").trim();

  // C6: Supprime les actions entre astérisques (*se lève*, *rit*, etc.)
  t = t.replace(/\*[^*]+\*/g, "").trim();

  // Supprime le markdown restant
  t = t
    .replace(/\*\*/g, "")
    .replace(/_([^_]+)_/g, "$1");

  // C1: Remplace les tirets cadratins par des virgules
  t = t.replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",");

  // Enlève les guillemets extérieurs
  t = t.replace(/^["']|["']$/g, "").trim();

  // Enlève le préfixe "Nom: " ou "Nom - " que certaines IA ajoutent
  if (playerName) {
    const escapedName = playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`^${escapedName}\\s*[:\\-]\\s*["']?`, "i"), "").trim();
  }
  // Préfixe générique "MotCapitalisé: " (n'importe quel nom propre suivi de ":")
  t = t.replace(/^[A-ZÀ-Ÿ][a-zà-ÿ]{1,15}\s*:\s*["']?/, "").trim();

  // B3: Supprime les didascalies d'action physique — RENFORCÉ
  const PHYSICAL_VERBS =
    "se\\s+\\w+|prend|regarde|écoute|fronce|lève|soupire|hoche|secoue|croise|" +
    "s['']avance|s['']arrête|hésite|sourit|rit|ricane|semble|paraît|a\\s+l['']air|" +
    "tourne|se\\s+lève|se\\s+rassied|se\\s+redresse|observe|fixe|" +
    "inspire|expire|déglutit|acquiesce|hausse|penche|recule|avance|" +
    "tapote|pianote|gratte|mord|serre|claque|frappe|ajuste|replace";
  const didascaliePattern = new RegExp(
    `^(?:[A-ZÀ-Ÿ][a-zà-ÿ]+|[Jj]e|[Ii]l|[Ee]lle)\\s+(?:${PHYSICAL_VERBS})\\b[^.!?]*[.!?]\\s*`,
    "i"
  );
  t = t.replace(didascaliePattern, "").trim();
  // B3: Also catch mid-text didascalies
  const midDidascalie = new RegExp(
    `(?:[Jj]e|[Ii]l|[Ee]lle)\\s+(?:${PHYSICAL_VERBS})\\b[^.!?]*[.!?]\\s*`,
    "gi"
  );
  t = t.replace(midDidascalie, "").trim();

  // C4: fixThirdPerson — si l'IA parle d'elle-même à la 3ème personne
  if (playerName) {
    const esc = playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // "Prénom pense/dit/hésite/regarde/etc." → supprime la phrase entière
    const thirdPerson = new RegExp(
      `${esc}\\s+(?:pense|dit|hésite|regarde|observe|écoute|soupire|hoche|réfléchit|se\\s+\\w+|a\\s+l['']air|semble|reste|est\\s+(?:convaincu|persuadé|sûr|certain|inqui[eè]t|méfiant|suspicieux|d'accord|perplexe))\\b[^.!?]*[.!?]\\s*`,
      "gi"
    );
    t = t.replace(thirdPerson, "").trim();
    // Also catch "[Name], [pronoun] ..." at sentence start → convert to "Je ..."
    t = t.replace(new RegExp(`^${esc},?\\s+(?:il|elle)\\s+`, "i"), "Je ").trim();
  }

  // CRITICAL: Remove sentences that leak internal reasoning or secret roles (global, not just at start)
  const REASONING_GLOBAL_PATTERNS = [
    // Secret role leaks — these should NEVER appear in public speech
    /[^.!?]*\bje suis (?:un |le |la )?(?:Loup-?Garou|Loup Alpha|loup|Voyante|Sorcière|Chasseur|Salvateur|Cupidon)\b[^.!?]*[.!?]?\s*/gi,
    /[^.!?]*\b(?:mon|mes) co(?:é|e)quipier(?:s)?\b[^.!?]*[.!?]?\s*/gi,
    /[^.!?]*\b(?:était|est) (?:notre|ma) cible\b[^.!?]*[.!?]?\s*/gi,
    /[^.!?]*\bje (?:dois|ne dois pas|vais|peux) (?:paraître|accuser|défendre|semer|tester|cacher|révéler|protéger mon)\b[^.!?]*[.!?]?\s*/gi,
    /[^.!?]*\b(?:ma stratégie|mon objectif|mon angle)\b[^.!?]*[.!?]?\s*/gi,
    // Context recap dumps
    /[^.!?]*\b(?:C'est le tour \d|Tour \d,? jour \d|Cycle \d)\b[^.!?]*[.!?]?\s*/gi,
    /[^.!?]*\b(?:Sorcière (?:peut avoir|a (?:peut-être|probablement)|a guéri)|Salvateur (?:peut avoir|a (?:peut-être|probablement)|a protégé))[^.!?]*[.!?]?\s*/gi,
  ];
  for (const pattern of REASONING_GLOBAL_PATTERNS) {
    t = t.replace(pattern, "").trim();
  }

  // A8: Remove sentences containing banned meta-game phrases
  const BANNED_PHRASES = [
    "détournement d'attention",
    "contrôler le narratif",
    "schéma classique",
    "pattern classique",
    "c'est du classique",
    "les loups adorent",
    "un loup ferait",
    "créer du chaos",
    "brasser de la confusion",
    "forcer la main",
    "noyer le poisson",
    "c'est exactement ce que",
    "comportement typique",
    "stratégie classique",
    "c'est un piège classique",
    // C3: New banned expressions
    "d'un point de vue",
    "force est de constater",
    "il est important de noter",
    "il convient de",
    "en ce qui concerne",
    "il est clair que",
    "les données pointent",
    "on est tous d'accord",
    "j'ai vu ça mille fois",
    "le schéma est clair",
    "c'est du déjà-vu",
    "d'un point de vue stratégique",
    "statistiquement",
    "les probabilités",
    "si on analyse",
    "objectivement parlant",
  ];
  for (const phrase of BANNED_PHRASES) {
    if (t.toLowerCase().includes(phrase)) {
      t = t.replace(new RegExp(`[^.!?]*${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.!?]*[.!?]?`, "gi"), "").trim();
    }
  }

  // A3: Replace "cycle X" with natural temporal language
  t = t.replace(/\b(au |le |du |depuis le )cycle (\d+)/gi, (_match, prefix: string, num: string) => {
    if (num === "1") return prefix + "premier jour";
    if (num === "2") return prefix + "deuxième jour";
    return "il y a quelques jours";
  });
  t = t.replace(/\bcycle (\d+)/gi, (_match, num: string) => {
    if (num === "1") return "premier jour";
    if (num === "2") return "deuxième jour";
    return "il y a quelques jours";
  });

  // C3: Supprime les participes traînants en fin de phrase
  t = t.replace(/,\s*(?:sachant|considérant|estimant|pensant|espérant|craignant|supposant|jugeant|notant|remarquant|observant|constatant)\s+que\b[^.!?]*/g, "");

  // Second passage : enlève à nouveau un éventuel guillemet ou préfixe résiduel
  t = t.replace(/^["']/, "").trim();

  // Nettoyage final : double espaces
  t = t.replace(/\s{2,}/g, " ").trim();

  return t;
}
