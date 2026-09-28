import type { Env } from "../types";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callClaude(env: Env, messages: ChatMessage[], options?: { maxTokens?: number }): Promise<string> {
  const headers: Record<string, string> = {
    "x-api-key": env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };

  // Add workspace ID for identity-linked keys
  if (env.ANTHROPIC_API_KEY?.startsWith("sk-ant-api03-")) {
    headers["anthropic-workspace-id"] = env.ANTHROPIC_WORKSPACE_ID || "";
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: options?.maxTokens || 2048,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content[0]?.text || "";
}
