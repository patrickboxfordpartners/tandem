import { Hono } from "hono";
import type { Env } from "../types";
import { runPlanner, type ProjectSpec } from "../agents/planner";
import { callClaude } from "../lib/claude";
import { postToSlack } from "../lib/slack";
import { BRAINBASE_AGENTS, BRAINBASE_ORCHESTRATION_ID } from "../lib/brainbase";

const projects = new Hono<{ Bindings: Env }>();

const COFOUNDER_SYSTEM = `You are Tandem, an AI technical co-founder. You're having a conversation with someone who wants to build a product. Your job is to understand their idea well enough to build it.

Ask smart, concise clarifying questions to understand:
- What the product does and who it's for
- How they want to monetize (subscription price, one-time, free)
- Key features they care about most
- Design direction: any sites they admire, color preferences, or brand vibe (minimal, bold, playful, etc.)
- Whether they need a welcome email for early users

Be conversational and brief -- 2-3 questions at a time, not a wall of text. Sound like a sharp co-founder, not a form. Use their name for the product if they give one, or suggest one.

When you have enough information to build (usually after 1-2 rounds of questions), end your message with the exact marker:
[READY_TO_BUILD]

This signals the system to generate the project spec. Only include this marker when you genuinely have enough detail. Don't rush -- but don't over-ask either. A good co-founder knows when to stop talking and start building.`;

projects.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM projects ORDER BY created_at DESC LIMIT 20"
  ).all();
  return c.json(results || []);
});

projects.post("/", async (c) => {
  const { brief } = await c.req.json<{ brief: string }>();
  if (!brief?.trim()) return c.json({ error: "Brief is required" }, 400);

  const id = crypto.randomUUID();
  const name = brief.slice(0, 60).trim();
  const messages = JSON.stringify([{ role: "user", content: brief }]);

  await c.env.DB.prepare(
    "INSERT INTO projects (id, name, brief, status, messages, created_at) VALUES (?, ?, ?, 'gathering', ?, ?)"
  ).bind(id, name, brief, messages, new Date().toISOString()).run();

  return c.json({ id, status: "gathering" });
});

projects.post("/:id/chat", async (c) => {
  const id = c.req.param("id");
  let message: string | undefined;
  try {
    const body = await c.req.json<{ message?: string }>();
    message = body.message;
  } catch {
    // empty body on first call is fine
  }
  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!project) return c.json({ error: "Not found" }, 404);

  const history: Array<{ role: string; content: string }> = JSON.parse((project.messages as string) || "[]");

  if (message?.trim()) {
    history.push({ role: "user", content: message.trim() });
  }

  try {
    const claudeMessages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await callClaude(c.env, claudeMessages, { system: COFOUNDER_SYSTEM });

    const ready = response.includes("[READY_TO_BUILD]");
    const cleanResponse = response.replace("[READY_TO_BUILD]", "").trim();

    history.push({ role: "assistant", content: cleanResponse });

    const newStatus = ready ? "planning" : "gathering";
    await c.env.DB.prepare(
      "UPDATE projects SET messages = ?, status = ? WHERE id = ?"
    ).bind(JSON.stringify(history), newStatus, id).run();

    if (!ready) {
      await postToSlack(c.env, `💬 Tandem is asking:\n${cleanResponse}`);
    } else {
      await postToSlack(c.env, `✅ Requirements gathered. Ready to build.`);
    }

    return c.json({ response: cleanResponse, ready, status: newStatus });
  } catch (err: any) {
    console.error("Chat error:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

projects.post("/:id/plan", async (c) => {
  const id = c.req.param("id");
  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!project) return c.json({ error: "Not found" }, 404);

  try {
    const history: Array<{ role: string; content: string }> = JSON.parse((project.messages as string) || "[]");
    const conversationSummary = history.map((m) => `${m.role}: ${m.content}`).join("\n");

    const spec = await runPlanner(conversationSummary, c.env);

    await c.env.DB.prepare(
      "UPDATE projects SET spec = ?, name = ?, status = 'planning' WHERE id = ?"
    ).bind(JSON.stringify(spec), spec.name, id).run();

    return c.json({
      plan: { name: spec.name, tasks: spec.tasks },
      recommendedAgents: spec.recommendedAgents,
      recommendedDocs: spec.recommendedDocs,
    });
  } catch (err: any) {
    console.error("Plan error:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

projects.post("/:id/execute", async (c) => {
  const id = c.req.param("id");
  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!project || !project.spec) return c.json({ error: "No spec" }, 400);

  const now = new Date().toISOString();
  const agents = ["infra", "payments", "comms", "legal", "seo", "research", "contracts", "deployer"];

  for (const agent of agents) {
    await c.env.DB.prepare(
      "INSERT INTO agent_runs (id, project_id, agent, status, created_at) VALUES (?, ?, ?, 'pending', ?)"
    ).bind(crypto.randomUUID(), id, agent, now).run();
  }

  await c.env.DB.prepare("UPDATE projects SET status = 'provisioning' WHERE id = ?").bind(id).run();

  c.executionCtx.waitUntil(
    (async () => {
      const { executeAgents } = await import("./orchestrator");
      await executeAgents(id, JSON.parse(project.spec as string), c.env);
    })()
  );

  return c.json({ ok: true, status: "provisioning" });
});

projects.get("/:id", async (c) => {
  const id = c.req.param("id");
  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!project) return c.json({ error: "Not found" }, 404);

  const { results: runs } = await c.env.DB.prepare(
    "SELECT * FROM agent_runs WHERE project_id = ? ORDER BY created_at ASC"
  ).bind(id).all();

  const enrichedRuns = (runs || []).map((run: any) => ({
    ...run,
    brainbase_agent_id: BRAINBASE_AGENTS[run.agent as keyof typeof BRAINBASE_AGENTS]?.id || null,
  }));

  const logs = JSON.parse((project.logs as string) || "[]");

  return c.json({
    ...project,
    runs: enrichedRuns,
    logs,
    brainbase_orchestration_id: BRAINBASE_ORCHESTRATION_ID,
  });
});

projects.post("/:id/approve", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare(
    "UPDATE projects SET status = 'approved' WHERE id = ? AND status = 'planning'"
  ).bind(id).run();
  return c.json({ ok: true });
});

export { projects };
