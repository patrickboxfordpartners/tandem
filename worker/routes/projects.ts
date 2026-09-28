import { Hono } from "hono";
import type { Env } from "../types";
import { runPlanner, type ProjectSpec } from "../agents/planner";

const projects = new Hono<{ Bindings: Env }>();

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

  await c.env.DB.prepare(
    "INSERT INTO projects (id, name, brief, status, created_at) VALUES (?, ?, ?, 'planning', ?)"
  ).bind(id, name, brief, new Date().toISOString()).run();

  return c.json({ id, status: "planning" });
});

projects.post("/:id/plan", async (c) => {
  const id = c.req.param("id");
  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!project) return c.json({ error: "Not found" }, 404);

  try {
    const spec = await runPlanner(project.brief as string, c.env);

    await c.env.DB.prepare(
      "UPDATE projects SET spec = ?, name = ?, status = 'planning' WHERE id = ?"
    ).bind(JSON.stringify(spec), spec.name, id).run();

    return c.json({ plan: { name: spec.name, tasks: spec.tasks } });
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
  const agents = ["infra", "payments", "comms", "deployer"];

  for (const agent of agents) {
    await c.env.DB.prepare(
      "INSERT INTO agent_runs (id, project_id, agent, status, created_at) VALUES (?, ?, ?, 'pending', ?)"
    ).bind(crypto.randomUUID(), id, agent, now).run();
  }

  await c.env.DB.prepare("UPDATE projects SET status = 'provisioning' WHERE id = ?").bind(id).run();

  // Fire-and-forget: run agents in background
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

  return c.json({ ...project, runs: runs || [] });
});

projects.post("/:id/approve", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare(
    "UPDATE projects SET status = 'approved' WHERE id = ? AND status = 'planning'"
  ).bind(id).run();
  return c.json({ ok: true });
});

export { projects };
