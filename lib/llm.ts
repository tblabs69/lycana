import type { Provider, LLMRequest, LLMResponse } from "./providers";
import { debugLog } from "@/lib/debug";

// ── TOKEN TRACKING (side-effect, shared by providers) ────────────────────

interface UsageData {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreateTokens?: number;
}

interface TokenStats {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  provider: Provider | null;
}

const _stats: TokenStats = {
  calls: 0, inputTokens: 0, outputTokens: 0,
  cacheReadTokens: 0, cacheCreateTokens: 0, provider: null,
};

/** Called by providers after each API call to record usage */
export function trackUsage(usage: UsageData) {
  _stats.calls++;
  _stats.inputTokens += usage.inputTokens;
  _stats.outputTokens += usage.outputTokens;
  _stats.cacheReadTokens += usage.cacheReadTokens || 0;
  _stats.cacheCreateTokens += usage.cacheCreateTokens || 0;
}

export function getTokenStats() { return { ..._stats }; }

export function resetTokenStats() {
  _stats.calls = 0;
  _stats.inputTokens = 0;
  _stats.outputTokens = 0;
  _stats.cacheReadTokens = 0;
  _stats.cacheCreateTokens = 0;
  _stats.provider = null;
}

/** Pricing per 1M tokens */
const PRICING: Record<Provider, { input: number; output: number; cacheWrite?: number; cacheRead?: number }> = {
  anthropic: { input: 0.80, output: 4.00, cacheWrite: 1.00, cacheRead: 0.08 },
  openai: { input: 0.15, output: 0.60 },
};

export function logGameCost() {
  const provider = _stats.provider || "anthropic";
  const pricing = PRICING[provider];

  const inputCost = (_stats.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (_stats.outputTokens / 1_000_000) * pricing.output;
  const cacheWriteCost = pricing.cacheWrite ? (_stats.cacheCreateTokens / 1_000_000) * pricing.cacheWrite : 0;
  const cacheReadCost = pricing.cacheRead ? (_stats.cacheReadTokens / 1_000_000) * pricing.cacheRead : 0;
  const total = inputCost + outputCost + cacheWriteCost + cacheReadCost;
  const totalCacheTokens = _stats.cacheReadTokens + _stats.cacheCreateTokens;
  const cacheHitRate = totalCacheTokens > 0 ? Math.round((_stats.cacheReadTokens / totalCacheTokens) * 100) : 0;

  debugLog(`\n=== FIN DE PARTIE (${provider}) ===`);
  debugLog(`Appels API     : ${_stats.calls}`);
  debugLog(`Tokens input   : ${_stats.inputTokens.toLocaleString()} (dont ${_stats.cacheReadTokens.toLocaleString()} cache_read)`);
  debugLog(`Tokens output  : ${_stats.outputTokens.toLocaleString()}`);
  debugLog(`Cache hit rate : ${cacheHitRate}%`);
  debugLog(`Coût estimé    : $${total.toFixed(4)}`);
  debugLog(`  - Input      : $${inputCost.toFixed(4)}`);
  debugLog(`  - Output     : $${outputCost.toFixed(4)}`);
  if (cacheWriteCost) debugLog(`  - Cache write: $${cacheWriteCost.toFixed(4)}`);
  if (cacheReadCost) debugLog(`  - Cache read : $${cacheReadCost.toFixed(4)}`);
  debugLog(`====================\n`);

  return {
    total, calls: _stats.calls, provider,
    inputTokens: _stats.inputTokens, outputTokens: _stats.outputTokens,
    cacheReadTokens: _stats.cacheReadTokens, cacheCreateTokens: _stats.cacheCreateTokens,
    cacheHitRate,
  };
}

// ── ROUTER ──────────────────────────────────────────────────────────────

/** Main LLM call — routes to the correct provider */
export async function callLLM(
  apiKey: string,
  provider: Provider,
  request: LLMRequest,
): Promise<LLMResponse> {
  _stats.provider = provider;

  // Lazy imports to avoid loading both SDKs on every call
  if (provider === "anthropic") {
    const { callAnthropic } = await import("./provider-anthropic");
    return callAnthropic(apiKey, request);
  } else {
    const { callOpenAI } = await import("./provider-openai");
    return callOpenAI(apiKey, request);
  }
}

/** LLM call expecting JSON — uses response_format for OpenAI, prompt-only for Anthropic */
export async function callLLMJSON(
  apiKey: string,
  provider: Provider,
  request: LLMRequest,
): Promise<LLMResponse> {
  _stats.provider = provider;

  if (provider === "anthropic") {
    const { callAnthropic } = await import("./provider-anthropic");
    return callAnthropic(apiKey, request);
  } else {
    const { callOpenAIJSON } = await import("./provider-openai");
    return callOpenAIJSON(apiKey, request);
  }
}
