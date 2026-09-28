import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { projects } from "./routes/projects";
import { getOrchestrationGraph } from "./lib/brainbase";

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  console.error("Unhandled error:", err.message, err.stack);
  return c.json({ error: "Internal server error" }, 500);
});

app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

app.get("/api/brainbase", (c) => c.json(getOrchestrationGraph()));

app.get("/api/visits", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT path, ip, user_agent, referer, country, created_at FROM visits ORDER BY created_at DESC LIMIT 100"
  ).all();
  const { results: stats } = await c.env.DB.prepare(
    "SELECT COUNT(*) as total, COUNT(DISTINCT ip) as unique_visitors FROM visits"
  ).all();
  return c.json({ visits: results || [], stats: stats?.[0] || {} });
});

app.route("/api/projects", projects);

app.all("*", async (c) => {
  const url = new URL(c.req.url);
  if (!url.pathname.startsWith("/assets/")) {
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        "INSERT INTO visits (path, ip, user_agent, referer, country, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(
        url.pathname,
        c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown",
        (c.req.header("user-agent") || "").slice(0, 200),
        (c.req.header("referer") || "").slice(0, 200),
        c.req.header("cf-ipcountry") || "unknown",
        new Date().toISOString()
      ).run().catch(() => {})
    );
  }

  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status === 404) {
    return c.env.ASSETS.fetch(new Request(new URL("/index.html", c.req.url)));
  }
  return res;
});

export default app;
