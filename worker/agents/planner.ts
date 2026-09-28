import type { Env } from "../types";
import { callClaude } from "../lib/claude";

export interface RecommendedAgent {
  name: string;
  purpose: string;
  triggers: string;
}

export interface RecommendedDoc {
  name: string;
  purpose: string;
}

export interface DesignPrefs {
  theme: "dark" | "light";
  accent: string;
  vibe: string;
}

export interface ProjectSpec {
  name: string;
  slug: string;
  description: string;
  subscription: { amount: number; currency: string; interval: "month" | "year" } | null;
  oneTimePrice: number | null;
  features: string[];
  welcomeEmail: { subject: string; body: string } | null;
  tasks: string[];
  faq: Array<{ q: string; a: string }>;
  design: DesignPrefs;
  recommendedAgents: RecommendedAgent[];
  recommendedDocs: RecommendedDoc[];
}

export async function runPlanner(brief: string, env: Env): Promise<ProjectSpec> {
  const response = await callClaude(
    env,
    [{ role: "user", content: brief }],
    {
      system: `You are Tandem's Planner agent. You analyze business ideas and create structured project specifications.

Your job: Parse the user's business idea into a structured spec that other agents will execute. Think creatively about the product name, features, and positioning. Also recommend what backend agents and documentation the product will need as it grows.

Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "name": "Creative Product Name",
  "slug": "product-name",
  "description": "A compelling one-sentence description that sells the product",
  "subscription": { "amount": 1500, "currency": "usd", "interval": "month" } or null,
  "oneTimePrice": null or amount in cents,
  "features": ["Compelling feature description 1", "Feature 2", ...],
  "welcomeEmail": { "subject": "Welcome to [Name]!", "body": "A warm, professional welcome email body" } or null,
  "faq": [{ "q": "Question a prospect would ask", "a": "Clear, helpful answer" }, ...],
  "design": { "theme": "dark" or "light", "accent": "#hex color for primary accent", "vibe": "Brief style description" },
  "tasks": ["task 1", "task 2", ...],
  "recommendedAgents": [
    { "name": "Agent Name", "purpose": "What this agent does for the business", "triggers": "When this agent activates" }
  ],
  "recommendedDocs": [
    { "name": "Document Name", "purpose": "Why this document matters" }
  ]
}

Rules:
- Generate a creative, memorable product name (not just the user's words)
- Write 5-6 features as benefit statements, not just feature labels
- Description should be a value proposition, not a feature list
- Amounts are in cents (e.g., 1500 = $15.00)
- The slug must be lowercase alphanumeric with hyphens only (max 20 chars)
- Always include a welcomeEmail
- Tasks should describe what the agent team will do (3-5 steps)
- recommendedAgents: 3-5 backend agents the product will need (e.g., onboarding agent, billing agent, support agent, analytics agent). Be specific to the business type.
- recommendedDocs: 3-4 documents that should be created (e.g., API documentation, onboarding guide, privacy policy, terms of service). Be specific to the business.
- faq: 4-6 questions a prospective customer would ask, with clear answers. These become structured FAQ data on the landing page for AI discoverability.
- design: Extract from the conversation. If user mentioned "light" or "Stripe-like", use theme "light". Pick an accent color that matches their request (e.g., green = "#16a34a", blue = "#2563eb"). Vibe should be 2-3 words (e.g., "clean and modern", "bold and minimal").`,
    }
  );

  const cleaned = response.replace(/```json?\s*/g, "").replace(/```\s*/g, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Planner did not return valid JSON: " + response.slice(0, 200));
  const spec = JSON.parse(match[0]) as ProjectSpec;
  if (!spec.faq) spec.faq = [];
  if (!spec.recommendedAgents) spec.recommendedAgents = [];
  if (!spec.recommendedDocs) spec.recommendedDocs = [];
  return spec;
}
