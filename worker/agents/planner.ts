import type { Env } from "../types";
import { callClaude } from "../lib/claude";

export interface ProjectSpec {
  name: string;
  slug: string;
  description: string;
  subscription: { amount: number; currency: string; interval: "month" | "year" } | null;
  oneTimePrice: number | null;
  features: string[];
  welcomeEmail: { subject: string; body: string } | null;
  tasks: string[];
}

export async function runPlanner(brief: string, env: Env): Promise<ProjectSpec> {
  const response = await callClaude(
    env,
    [{ role: "user", content: brief }],
    {
      system: `You are Tandem's Planner agent. You analyze business ideas and create structured project specifications.

Your job: Parse the user's business idea into a structured spec that other agents will execute. Think creatively about the product name, features, and positioning.

Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "name": "Creative Product Name",
  "slug": "product-name",
  "description": "A compelling one-sentence description that sells the product",
  "subscription": { "amount": 1500, "currency": "usd", "interval": "month" } or null,
  "oneTimePrice": null or amount in cents,
  "features": ["Compelling feature description 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5", "Feature 6"],
  "welcomeEmail": { "subject": "Welcome to [Name]!", "body": "A warm, professional welcome email body" } or null,
  "tasks": ["task 1", "task 2", ...]
}

Rules:
- Generate a creative, memorable product name (not just the user's words)
- Write 5-6 features as benefit statements, not just feature labels
- Description should be a value proposition, not a feature list
- Amounts are in cents (e.g., 1500 = $15.00)
- The slug must be lowercase alphanumeric with hyphens only (max 20 chars)
- Always include a welcomeEmail
- Tasks should describe what the agent team will do (3-5 steps)`,
    }
  );

  const cleaned = response.replace(/```json?\s*/g, "").replace(/```\s*/g, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Planner did not return valid JSON: " + response.slice(0, 200));
  return JSON.parse(match[0]) as ProjectSpec;
}
