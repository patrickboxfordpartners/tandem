import type { Env } from "../types";
import type { ProjectSpec } from "./planner";
import { callClaude } from "../lib/claude";

export interface ResearchResult {
  competitors: Array<{ name: string; strength: string; gap: string }>;
  positioning: string;
  risks: string[];
  quickWins: string[];
}

export async function runResearchAgent(projectId: string, spec: ProjectSpec, env: Env): Promise<ResearchResult> {
  const response = await callClaude(env, [
    {
      role: "user",
      content: `Analyze the competitive landscape for this product:

Name: ${spec.name}
Description: ${spec.description}
Features: ${spec.features.join(", ")}

Return JSON only:
{
  "competitors": [{ "name": "Competitor Name", "strength": "What they do well", "gap": "Where they fall short that we can exploit" }],
  "positioning": "One sentence on how to position against competitors",
  "risks": ["Risk 1", "Risk 2", "Risk 3"],
  "quickWins": ["Quick win 1", "Quick win 2", "Quick win 3"]
}

Be specific and realistic. Name 3-4 real or likely competitors in this space. Risks should be honest business risks. Quick wins should be actionable first-week tasks.`,
    },
  ], {
    system: "You are a startup strategist. Return only valid JSON. No markdown fences, no explanation.",
  });

  const cleaned = response.replace(/```json?\s*/g, "").replace(/```\s*/g, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Research agent did not return valid JSON");
  return JSON.parse(match[0]) as ResearchResult;
}
