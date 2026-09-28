import { Hono } from "hono";
import type { Env } from "../types";

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
