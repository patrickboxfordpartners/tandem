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
      system: `You are Tandem's Planner agent. Parse a business idea into a structured project specification.
Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "name": "Business Name",
  "slug": "business-name",
  "description": "One sentence description",
  "subscription": { "amount": 1500, "currency": "usd", "interval": "month" } or null,
  "oneTimePrice": null or amount in cents,
  "features": ["feature 1", "feature 2"],
  "welcomeEmail": { "subject": "Welcome to ...", "body": "plain text email body" } or null,
  "tasks": ["human-readable task 1", "human-readable task 2", ...]
}
The tasks array should list 3-5 steps the agent team will execute: infrastructure, payments, email, deployment.
Amounts are in cents (e.g., 1500 = $15.00).
The slug must be lowercase alphanumeric with hyphens only.`,
    }
  );

  const cleaned = response.replace(/```json?\s*/g, "").replace(/```\s*/g, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Planner did not return valid JSON: " + response.slice(0, 200));
  return JSON.parse(match[0]) as ProjectSpec;
}
