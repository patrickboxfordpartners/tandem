import type { Env } from "../types";

export async function postToSlack(env: Env, message: string): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL) return;

  try {
    await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
  } catch (err) {
    console.error("Slack notification failed:", err);
  }
}
