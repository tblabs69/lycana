import Anthropic from "@anthropic-ai/sdk";
import type { LLMRequest, LLMResponse } from "./providers";
import { MODELS } from "./providers";
import { debugLog } from "@/lib/debug";
import { trackUsage } from "@/lib/llm";

export async function callAnthropic(
  apiKey: string,
  request: LLMRequest,
): Promise<LLMResponse> {
  const client = new Anthropic({ apiKey });
  const model = MODELS.anthropic.default;

  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: request.userMessage },
  ];
  if (request.prefill) {
    messages.push({ role: "assistant", content: request.prefill });
  }

  const response = await client.messages.create({
    model,
    max_tokens: request.maxTokens,
    temperature: request.temperature ?? 0.8,
    stream: false,
    system: [
      {
        type: "text",
        text: request.systemPrompt,
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

  trackUsage({
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens || 0,
    cacheCreateTokens: usage.cache_creation_input_tokens || 0,
  });

  const ctxChars = request.systemPrompt.length + request.userMessage.length;
  debugLog(`[API:anthropic] ${model} | input: ${usage.input_tokens} | cache_read: ${usage.cache_read_input_tokens || 0} | cache_create: ${usage.cache_creation_input_tokens || 0} | output: ${usage.output_tokens} | ctx_chars: ${ctxChars}`);

  const content = response.content[0];
  const text = content?.type === "text" ? content.text : "";

  return { text };
}
