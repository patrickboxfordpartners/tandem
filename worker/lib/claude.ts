import type { Env } from "../types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function callClaude(
  env: Env,
  messages: ChatMessage[],
  options?: { maxTokens?: number; system?: string }
): Promise<string> {
  const body: any = {
    model: "claude-sonnet-5",
    max_tokens: options?.maxTokens || 2048,
    messages,
  };

  if (options?.system) {
    body.system = options.system;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content[0]?.text || "";
}
