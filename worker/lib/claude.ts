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
    max_tokens: options?.maxTokens || 16000,
    thinking: { type: "adaptive" },
    messages,
  };

  if (options?.system) {
    body.system = options.system;
  }

  const headers: Record<string, string> = {
    "x-api-key": env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };
  if (env.ANTHROPIC_WORKSPACE_ID) {
    headers["anthropic-workspace-id"] = env.ANTHROPIC_WORKSPACE_ID;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${raw}`);
  }

  const data = JSON.parse(raw) as { content: Array<{ type: string; text?: string }> };
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) {
    throw new Error(`Claude returned no text block: ${raw.slice(0, 500)}`);
  }
  return textBlock.text;
}
