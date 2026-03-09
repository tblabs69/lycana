import OpenAI from "openai";
import type { LLMRequest, LLMResponse } from "./providers";
import { MODELS } from "./providers";
import { debugLog } from "@/lib/debug";
import { trackUsage } from "@/lib/llm";

export async function callOpenAI(
  apiKey: string,
  request: LLMRequest,
): Promise<LLMResponse> {
  const client = new OpenAI({ apiKey });
  const model = MODELS.openai.default;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: request.systemPrompt },
    { role: "user", content: request.userMessage },
  ];

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: request.maxTokens,
    temperature: request.temperature ?? 0.8,
    messages,
  });

  const usage = response.usage;
  trackUsage({
    inputTokens: usage?.prompt_tokens || 0,
    outputTokens: usage?.completion_tokens || 0,
  });

  const ctxChars = request.systemPrompt.length + request.userMessage.length;
  debugLog(`[API:openai] ${model} | input: ${usage?.prompt_tokens || 0} | output: ${usage?.completion_tokens || 0} | ctx_chars: ${ctxChars}`);

  const text = response.choices[0]?.message?.content ?? "";
  return { text };
}

/** Variante JSON — force response_format: json_object */
export async function callOpenAIJSON(
  apiKey: string,
  request: LLMRequest,
): Promise<LLMResponse> {
  const client = new OpenAI({ apiKey });
  const model = MODELS.openai.default;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: request.systemPrompt },
    { role: "user", content: request.userMessage },
  ];

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: request.maxTokens,
    temperature: request.temperature ?? 0.8,
    response_format: { type: "json_object" },
    messages,
  });

  const usage = response.usage;
  trackUsage({
    inputTokens: usage?.prompt_tokens || 0,
    outputTokens: usage?.completion_tokens || 0,
  });

  const ctxChars = request.systemPrompt.length + request.userMessage.length;
  debugLog(`[API:openai:json] ${model} | input: ${usage?.prompt_tokens || 0} | output: ${usage?.completion_tokens || 0} | ctx_chars: ${ctxChars}`);

  const text = response.choices[0]?.message?.content ?? "";
  return { text };
}
