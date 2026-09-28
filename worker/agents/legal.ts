import type { Env } from "../types";
import type { ProjectSpec } from "./planner";
import { callClaude } from "../lib/claude";

export interface LegalResult {
  privacyPolicy: string;
  termsOfService: string;
}

export async function runLegalAgent(projectId: string, spec: ProjectSpec, env: Env): Promise<LegalResult> {
  const response = await callClaude(env, [
    {
      role: "user",
      content: `Generate a privacy policy and terms of service for this business:

Name: ${spec.name}
Description: ${spec.description}
Features: ${spec.features.join(", ")}
Collects payment: ${spec.subscription || spec.oneTimePrice ? "Yes, via Stripe" : "No"}

Return JSON only: { "privacyPolicy": "full HTML privacy policy", "termsOfService": "full HTML terms of service" }

Requirements:
- Professional, real legal language (not a template placeholder)
- Reference the actual business name and what data it collects
- Include sections for: data collection, use, sharing, cookies, rights, contact
- Terms should cover: service description, payment terms (if applicable), liability, termination
- Use simple HTML (h2, p, ul tags) for formatting
- Keep each document concise but complete (300-500 words each)`,
    },
  ], {
    system: "You are a legal document generator. Return only valid JSON with privacyPolicy and termsOfService as HTML strings. No markdown fences.",
  });

  const cleaned = response.replace(/```json?\s*/g, "").replace(/```\s*/g, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Legal agent did not return valid JSON");
  return JSON.parse(match[0]) as LegalResult;
}
