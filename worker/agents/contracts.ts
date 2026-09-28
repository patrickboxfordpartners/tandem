import type { Env } from "../types";
import type { ProjectSpec } from "./planner";
import { callClaude } from "../lib/claude";

export interface ContractsResult {
  agreementHtml: string;
}

export async function runContractsAgent(projectId: string, spec: ProjectSpec, env: Env): Promise<ContractsResult> {
  const response = await callClaude(env, [
    {
      role: "user",
      content: `Generate a professional service agreement for this business:

Name: ${spec.name}
Description: ${spec.description}
Features: ${spec.features.join(", ")}
Pricing: ${spec.subscription ? `$${(spec.subscription.amount / 100).toFixed(2)}/${spec.subscription.interval}` : spec.oneTimePrice ? `$${(spec.oneTimePrice / 100).toFixed(2)} one-time` : "Free"}

Return the agreement as clean HTML (h2, p, ol, li tags). Include these sections:
1. Parties (service provider = ${spec.name}, client = [Client Name])
2. Scope of Services (based on the features)
3. Payment Terms (based on the pricing)
4. Term and Termination
5. Confidentiality
6. Limitation of Liability
7. Governing Law
8. Signatures (placeholder lines for both parties with date fields)

Make it professional but readable. Use the actual business name and pricing throughout. Return ONLY the HTML content, no wrapper, no markdown fences.`,
    },
  ], {
    system: "You are a contracts specialist. Return only clean HTML content for a service agreement. No markdown, no code fences, no explanation.",
  });

  const cleaned = response.replace(/```html?\s*/g, "").replace(/```\s*/g, "").trim();
  return { agreementHtml: cleaned };
}
