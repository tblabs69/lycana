/**
 * Shared text cleanup utilities — provider-agnostic.
 * Used by debate, wolf-chat, love-chat routes to clean AI responses.
 */

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

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of REASONING_PATTERNS) {
      const before = t;
      t = t.replace(pattern, "").trim();
      if (t !== before) {
        changed = true;
        break;
      }
    }
  }

  // Also strip bullet-point style reasoning lines
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

  // Enlève le préfixe "Nom: " ou "Nom - "
  if (playerName) {
    const escapedName = playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`^${escapedName}\\s*[:\\-]\\s*["']?`, "i"), "").trim();
  }
  // Préfixe générique "MotCapitalisé: "
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

  // C4: fixThirdPerson
  if (playerName) {
    const esc = playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const thirdPerson = new RegExp(
      `${esc}\\s+(?:pense|dit|hésite|regarde|observe|écoute|soupire|hoche|réfléchit|se\\s+\\w+|a\\s+l['']air|semble|reste|est\\s+(?:convaincu|persuadé|sûr|certain|inqui[eè]t|méfiant|suspicieux|d'accord|perplexe))\\b[^.!?]*[.!?]\\s*`,
      "gi"
    );
    t = t.replace(thirdPerson, "").trim();
    t = t.replace(new RegExp(`^${esc},?\\s+(?:il|elle)\\s+`, "i"), "Je ").trim();
  }

  // CRITICAL: Remove sentences that leak internal reasoning or secret roles
  const REASONING_GLOBAL_PATTERNS = [
    /[^.!?]*\bje suis (?:un |le |la )?(?:Loup-?Garou|Loup Alpha|loup|Voyante|Sorcière|Chasseur|Salvateur|Cupidon)\b[^.!?]*[.!?]?\s*/gi,
    /[^.!?]*\b(?:mon|mes) co(?:é|e)quipier(?:s)?\b[^.!?]*[.!?]?\s*/gi,
    /[^.!?]*\b(?:était|est) (?:notre|ma) cible\b[^.!?]*[.!?]?\s*/gi,
    /[^.!?]*\bje (?:dois|ne dois pas|vais|peux) (?:paraître|accuser|défendre|semer|tester|cacher|révéler|protéger mon)\b[^.!?]*[.!?]?\s*/gi,
    /[^.!?]*\b(?:ma stratégie|mon objectif|mon angle)\b[^.!?]*[.!?]?\s*/gi,
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

  // Second passage
  t = t.replace(/^["']/, "").trim();

  // Nettoyage final : double espaces
  t = t.replace(/\s{2,}/g, " ").trim();

  return t;
}
