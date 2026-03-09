// lib/providers.ts — Interface commune multi-provider

export type Provider = "anthropic" | "openai";

export interface LLMRequest {
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  temperature?: number;
  prefill?: string; // Anthropic: assistant prefill; OpenAI: ignored
}

export interface LLMResponse {
  text: string;
}

/** Détecte le provider à partir du préfixe de la clé */
export function detectProvider(apiKey: string): Provider | null {
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("sk-")) return "openai";
  return null;
}

/** Modèles par provider — centralisés ici pour pouvoir router par type d'appel plus tard */
export const MODELS = {
  anthropic: {
    default: "claude-haiku-4-5-20251001",
  },
  openai: {
    default: "gpt-4o-mini",
  },
} as const;

/** Températures par contexte de jeu */
export const TEMPERATURES = {
  villager: 0.8,
  wolf: 0.6,
  narrator: 0.7,
} as const;
