# Tandem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Tandem, an AI technical co-founder that provisions real infrastructure, payments, email, and deploys a working product from a natural language brief.

**Architecture:** Cloudflare Worker (Hono) serves a React chat SPA. User describes a project. A Planner agent (Claude) parses the brief into a structured spec. An orchestrator dispatches specialist agents (Infra, Payments, Comms, Deployer) that call real APIs in parallel. Results stream back to the chat UI. Brainbase integration is a pluggable module swapped in when SDK access is available.

**Tech Stack:** Cloudflare Workers + Hono, Vite + React 18 + Tailwind, D1 (SQLite), Anthropic Claude, Stripe API, Cloudflare API, Postmark API, Brainbase SDK (pluggable)

**Spec:** `/Users/patrickmitchell/tandem/SPEC.md`

## Global Constraints

- Node.js runtime via Cloudflare Workers (no Node built-ins unless polyfilled)
- All dates as ISO 8601 with Z suffix
- No curly/smart quotes in TypeScript
- Straight `"` and `'` only
- No emojis in code or UI unless requested
- Secrets via `wrangler secret put`, never in code
- D1 database for persistence
- `credentials: "include"` on all frontend fetch calls (for future auth)
- Hono literal routes MUST be registered before param routes

---

### Task 1: Project Scaffold + Wrangler Config + D1 Schema

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `wrangler.jsonc`
- Create: `worker/index.ts`
- Create: `worker/types.ts`
- Create: `migrations/0001_initial_schema.sql`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/lib/api.ts`
- Create: `index.html`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`

**Interfaces:**
- Produces: `Env` type with all bindings (DB, ASSETS, secrets), `api()` fetch helper, Hono app with health endpoint, D1 schema with `projects` and `agent_runs` tables

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/patrickmitchell/tandem
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install hono react react-dom react-router-dom tailwindcss @tailwindcss/vite lucide-react sonner stripe
npm install -D typescript @types/react @types/react-dom vite @vitejs/plugin-react wrangler vitest
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "worker"]
}
```

- [ ] **Step 4: Create wrangler.jsonc**

```jsonc
{
  "name": "tandem",
  "main": "worker/index.ts",
  "compatibility_date": "2026-09-28",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "tandem",
      "database_id": "PLACEHOLDER"
    }
  ]
}
```

- [ ] **Step 5: Create D1 database and update wrangler.jsonc**

```bash
npx wrangler d1 create tandem
```

Copy the returned `database_id` into `wrangler.jsonc`.

- [ ] **Step 6: Create migrations/0001_initial_schema.sql**

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brief TEXT NOT NULL,
  spec TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  worker_url TEXT,
  stripe_checkout_url TEXT,
  stripe_customer_id TEXT,
  stripe_product_id TEXT,
  postmark_domain TEXT,
  email_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  agent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input TEXT,
  output TEXT,
  error TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_project ON agent_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
```

- [ ] **Step 7: Apply migration**

```bash
npx wrangler d1 execute tandem --remote --file=migrations/0001_initial_schema.sql
```

- [ ] **Step 8: Create worker/types.ts**

```typescript
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  POSTMARK_API_KEY: string;
}
```

- [ ] **Step 9: Create worker/index.ts**

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  console.error("Unhandled error:", err.message, err.stack);
  return c.json({ error: "Internal server error" }, 500);
});

app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

app.all("*", async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status === 404) {
    return c.env.ASSETS.fetch(new Request(new URL("/index.html", c.req.url)));
  }
  return res;
});

export default app;
```

- [ ] **Step 10: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 11: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tandem</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 12: Create src/index.css**

```css
@import "tailwindcss";
```

- [ ] **Step 13: Create src/lib/api.ts**

```typescript
export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}
```

- [ ] **Step 14: Create src/main.tsx**

```tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] **Step 15: Create src/App.tsx (minimal shell)**

```tsx
import { useState } from "react";

export default function App() {
  return (
    <div className="h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">T</div>
        <h1 className="text-lg font-semibold">Tandem</h1>
        <span className="text-xs text-zinc-500">Your AI technical co-founder</span>
      </header>
      <main className="flex-1 flex items-center justify-center text-zinc-500">
        Chat UI goes here
      </main>
    </div>
  );
}
```

- [ ] **Step 16: Update package.json scripts**

Add to scripts:
```json
{
  "dev": "wrangler dev",
  "build": "vite build",
  "deploy": "vite build && wrangler deploy",
  "test": "vitest run"
}
```

- [ ] **Step 17: Build and deploy**

```bash
npm run deploy
```

Verify the health endpoint returns OK.

- [ ] **Step 18: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Tandem - Worker + SPA + D1 schema"
```

---

### Task 2: Chat UI + Message API

**Files:**
- Create: `src/components/Chat.tsx`
- Create: `src/components/MessageBubble.tsx`
- Create: `src/components/ApprovalCard.tsx`
- Create: `src/components/AgentStatusCard.tsx`
- Create: `worker/routes/projects.ts`
- Modify: `worker/index.ts` (mount routes)
- Modify: `src/App.tsx` (add Chat)

**Interfaces:**
- Consumes: `api()` from Task 1, `Env` type from Task 1
- Produces: `POST /api/projects` (create project from brief), `GET /api/projects/:id` (get project + agent runs), `POST /api/projects/:id/approve` (approve plan), `Chat` component with message streaming, `ApprovalCard` component

- [ ] **Step 1: Create worker/routes/projects.ts**

```typescript
import { Hono } from "hono";
import type { Env } from "../types";

const projects = new Hono<{ Bindings: Env }>();

projects.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM projects ORDER BY created_at DESC LIMIT 20"
  ).all();
  return c.json(results || []);
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

projects.post("/:id/approve", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare(
    "UPDATE projects SET status = 'approved' WHERE id = ? AND status = 'planning'"
  ).bind(id).run();
  return c.json({ ok: true });
});

export { projects };
```

- [ ] **Step 2: Mount routes in worker/index.ts**

Add import and route mounting after the health endpoint:

```typescript
import { projects } from "./routes/projects";

// after health endpoint:
app.route("/api/projects", projects);
```

- [ ] **Step 3: Create src/components/MessageBubble.tsx**

```tsx
interface MessageBubbleProps {
  role: "user" | "agent";
  agent?: string;
  content: string;
}

export function MessageBubble({ role, agent, content }: MessageBubbleProps) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser
          ? "bg-indigo-600 text-white"
          : "bg-zinc-800 text-zinc-100"
      }`}>
        {agent && <p className="text-xs text-indigo-400 font-medium mb-1">{agent}</p>}
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create src/components/ApprovalCard.tsx**

```tsx
interface ApprovalCardProps {
  plan: { name: string; tasks: string[] };
  onApprove: () => void;
  loading?: boolean;
}

export function ApprovalCard({ plan, onApprove, loading }: ApprovalCardProps) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 max-w-[80%]">
      <p className="text-xs text-indigo-400 font-medium mb-2">Planner</p>
      <p className="text-sm font-medium text-zinc-100 mb-3">Here's the plan for {plan.name}:</p>
      <ol className="space-y-1.5 mb-4">
        {plan.tasks.map((task, i) => (
          <li key={i} className="text-sm text-zinc-300 flex gap-2">
            <span className="text-zinc-500 font-mono text-xs mt-0.5">{i + 1}.</span>
            {task}
          </li>
        ))}
      </ol>
      <button
        onClick={onApprove}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
      >
        {loading ? "Launching..." : "Approve & Launch"}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Create src/components/AgentStatusCard.tsx**

```tsx
interface AgentRun {
  agent: string;
  status: string;
  output?: string;
}

const AGENT_LABELS: Record<string, string> = {
  planner: "Planner",
  infra: "Infrastructure",
  payments: "Payments",
  comms: "Email",
  deployer: "Deployer",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-zinc-500",
  running: "text-amber-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

export function AgentStatusCard({ runs }: { runs: AgentRun[] }) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 max-w-[80%]">
      <p className="text-xs text-indigo-400 font-medium mb-3">Agent Team</p>
      <div className="space-y-2">
        {runs.map((run) => (
          <div key={run.agent} className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full ${
              run.status === "running" ? "bg-amber-400 animate-pulse" :
              run.status === "completed" ? "bg-emerald-400" :
              run.status === "failed" ? "bg-red-400" : "bg-zinc-600"
            }`} />
            <span className="text-sm text-zinc-300 flex-1">{AGENT_LABELS[run.agent] || run.agent}</span>
            <span className={`text-xs font-mono ${STATUS_COLORS[run.status] || "text-zinc-500"}`}>
              {run.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create src/components/Chat.tsx**

```tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { MessageBubble } from "./MessageBubble";
import { ApprovalCard } from "./ApprovalCard";
import { AgentStatusCard } from "./AgentStatusCard";
import { Send } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "agent";
  agent?: string;
  content: string;
  type?: "text" | "plan" | "status" | "result";
  plan?: { name: string; tasks: string[] };
  runs?: Array<{ agent: string; status: string; output?: string }>;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "agent",
    agent: "Tandem",
    content: "Describe what you want to build. I'll handle the infrastructure, payments, email, and deployment.",
  }]);
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "planning" | "approval" | "executing" | "done">("idle");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pollProject = useCallback(async (id: string) => {
    try {
      const data = await api<any>(`/api/projects/${id}`);
      const runs = data.runs || [];

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.type !== "status");
        return [...filtered, {
          id: "status-" + Date.now(),
          role: "agent" as const,
          type: "status" as const,
          content: "",
          runs,
        }];
      });

      const allDone = runs.length > 0 && runs.every((r: any) => r.status === "completed" || r.status === "failed");
      if (allDone || data.status === "deployed" || data.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);

        const output: string[] = [];
        if (data.worker_url) output.push("Site: " + data.worker_url);
        if (data.stripe_checkout_url) output.push("Checkout: " + data.stripe_checkout_url);
        if (data.email_sent) output.push("Welcome email sent");

        setMessages((prev) => [...prev, {
          id: "result-" + Date.now(),
          role: "agent" as const,
          agent: "Tandem",
          content: output.length > 0
            ? "Your project is live:\n\n" + output.join("\n")
            : "Project provisioning complete.",
          type: "result" as const,
        }]);
        setPhase("done");
      }
    } catch {
      // poll failed, keep trying
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || phase !== "idle") return;
    const brief = input.trim();
    setInput("");

    setMessages((prev) => [...prev, {
      id: "user-" + Date.now(),
      role: "user",
      content: brief,
    }]);

    setPhase("planning");

    try {
      const { id } = await api<{ id: string }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ brief }),
      });
      setProjectId(id);

      const planResult = await api<{ plan: { name: string; tasks: string[] } }>(`/api/projects/${id}/plan`, {
        method: "POST",
      });

      setMessages((prev) => [...prev, {
        id: "plan-" + Date.now(),
        role: "agent" as const,
        type: "plan" as const,
        content: "",
        plan: planResult.plan,
      }]);
      setPhase("approval");
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: "error-" + Date.now(),
        role: "agent",
        agent: "Tandem",
        content: "Something went wrong: " + err.message,
      }]);
      setPhase("idle");
    }
  };

  const handleApprove = async () => {
    if (!projectId) return;
    setPhase("executing");

    try {
      await api(`/api/projects/${projectId}/approve`, { method: "POST" });
      await api(`/api/projects/${projectId}/execute`, { method: "POST" });

      pollRef.current = setInterval(() => pollProject(projectId), 2000);
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: "error-" + Date.now(),
        role: "agent",
        agent: "Tandem",
        content: "Execution failed: " + err.message,
      }]);
      setPhase("idle");
    }
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => {
          if (msg.type === "plan" && msg.plan) {
            return <ApprovalCard key={msg.id} plan={msg.plan} onApprove={handleApprove} loading={phase === "executing"} />;
          }
          if (msg.type === "status" && msg.runs) {
            return <AgentStatusCard key={msg.id} runs={msg.runs} />;
          }
          return <MessageBubble key={msg.id} role={msg.role} agent={msg.agent} content={msg.content} />;
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Describe what you want to build..."
            disabled={phase !== "idle" && phase !== "done"}
            className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || (phase !== "idle" && phase !== "done")}
            className="px-4 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Update src/App.tsx to use Chat**

```tsx
import { Chat } from "./components/Chat";

export default function App() {
  return (
    <div className="h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">T</div>
        <h1 className="text-lg font-semibold tracking-tight">Tandem</h1>
        <span className="text-xs text-zinc-500">Your AI technical co-founder</span>
      </header>
      <Chat />
    </div>
  );
}
```

- [ ] **Step 8: Build, deploy, verify chat renders**

```bash
npm run deploy
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: chat UI + project CRUD API"
```

---

### Task 3: Planner Agent (Claude)

**Files:**
- Create: `worker/agents/planner.ts`
- Create: `worker/lib/claude.ts`
- Create: `worker/routes/orchestrator.ts`
- Modify: `worker/routes/projects.ts` (add plan + execute endpoints)
- Modify: `worker/index.ts` (mount orchestrator)

**Interfaces:**
- Consumes: `Env` from Task 1, `projects` route from Task 2
- Produces: `POST /api/projects/:id/plan` (generates structured spec via Claude), `POST /api/projects/:id/execute` (dispatches agents), `runPlanner(brief, env): Promise<ProjectSpec>`, `ProjectSpec` type

- [ ] **Step 1: Create worker/lib/claude.ts**

```typescript
import type { Env } from "../types";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callClaude(env: Env, messages: ChatMessage[], options?: { maxTokens?: number }): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: options?.maxTokens || 2048,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content[0]?.text || "";
}
```

- [ ] **Step 2: Create worker/agents/planner.ts**

```typescript
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
  const response = await callClaude(env, [
    {
      role: "system",
      content: `You are Tandem's Planner agent. Parse a business idea into a structured project specification.
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
    },
    { role: "user", content: brief },
  ]);

  const match = response.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Planner did not return valid JSON");
  return JSON.parse(match[0]) as ProjectSpec;
}
```

- [ ] **Step 3: Add plan endpoint to worker/routes/projects.ts**

Add this route after the `POST /` route (but before any `/:id` param routes):

```typescript
import { runPlanner, type ProjectSpec } from "../agents/planner";

projects.post("/:id/plan", async (c) => {
  const id = c.req.param("id");
  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!project) return c.json({ error: "Not found" }, 404);

  const spec = await runPlanner(project.brief as string, c.env);

  await c.env.DB.prepare(
    "UPDATE projects SET spec = ?, name = ?, status = 'planning' WHERE id = ?"
  ).bind(JSON.stringify(spec), spec.name, id).run();

  return c.json({ plan: { name: spec.name, tasks: spec.tasks } });
});
```

- [ ] **Step 4: Add execute endpoint (dispatches agents)**

```typescript
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
      const { executeAgents } = await import("../routes/orchestrator");
      await executeAgents(id, JSON.parse(project.spec as string), c.env);
    })()
  );

  return c.json({ ok: true, status: "provisioning" });
});
```

- [ ] **Step 5: Create worker/routes/orchestrator.ts (stub)**

```typescript
import type { Env } from "../types";
import type { ProjectSpec } from "../agents/planner";

export async function executeAgents(projectId: string, spec: ProjectSpec, env: Env): Promise<void> {
  const updateRun = async (agent: string, status: string, output?: string, error?: string) => {
    await env.DB.prepare(
      "UPDATE agent_runs SET status = ?, output = ?, error = ?, " +
      (status === "running" ? "started_at" : "completed_at") + " = ? WHERE project_id = ? AND agent = ?"
    ).bind(status, output || null, error || null, new Date().toISOString(), projectId, agent).run();
  };

  // Run infra + payments + comms in parallel, deployer after infra
  const results = await Promise.allSettled([
    (async () => {
      await updateRun("infra", "running");
      // TODO: Task 4 wires this up
      await updateRun("infra", "completed", JSON.stringify({ message: "Infra agent not yet implemented" }));
    })(),
    (async () => {
      await updateRun("payments", "running");
      // TODO: Task 5 wires this up
      await updateRun("payments", "completed", JSON.stringify({ message: "Payments agent not yet implemented" }));
    })(),
    (async () => {
      await updateRun("comms", "running");
      // TODO: Task 6 wires this up
      await updateRun("comms", "completed", JSON.stringify({ message: "Comms agent not yet implemented" }));
    })(),
  ]);

  // Deployer runs after infra
  await updateRun("deployer", "running");
  await updateRun("deployer", "completed", JSON.stringify({ message: "Deployer agent not yet implemented" }));

  await env.DB.prepare("UPDATE projects SET status = 'deployed' WHERE id = ?").bind(projectId).run();
}
```

- [ ] **Step 6: Set ANTHROPIC_API_KEY secret**

```bash
npx wrangler secret put ANTHROPIC_API_KEY --name tandem
```

- [ ] **Step 7: Build, deploy, test end-to-end**

```bash
npm run deploy
```

Test: type a brief in the chat, see the plan, approve it, watch stub agents "complete".

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: planner agent + orchestrator + plan/execute flow"
```

---

### Task 4: Infra Agent (Cloudflare API)

**Files:**
- Create: `worker/agents/infra.ts`
- Modify: `worker/routes/orchestrator.ts` (wire infra agent)

**Interfaces:**
- Consumes: `ProjectSpec` from Task 3, `Env` from Task 1
- Produces: `runInfraAgent(projectId, spec, env): Promise<{ workerUrl: string }>` that provisions a real Cloudflare Worker + D1 and returns the live URL

- [ ] **Step 1: Create worker/agents/infra.ts**

```typescript
import type { Env } from "../types";
import type { ProjectSpec } from "./planner";

interface InfraResult {
  workerUrl: string;
  workerName: string;
}

async function cfApi(env: Env, path: string, method: string, body?: any): Promise<any> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as { success: boolean; result: any; errors: any[] };
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
  }
  return data.result;
}

export async function runInfraAgent(projectId: string, spec: ProjectSpec, env: Env): Promise<InfraResult> {
  const workerName = `tandem-${spec.slug}`;

  // Create a Worker script that serves a simple landing page
  const landingHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0a; color: #fafafa; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 600px; padding: 2rem; text-align: center; }
    h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem; }
    p { color: #a1a1aa; font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem; }
    .features { text-align: left; margin: 2rem 0; }
    .features li { color: #d4d4d8; padding: 0.5rem 0; list-style: none; }
    .features li::before { content: "\\2713"; color: #818cf8; margin-right: 0.75rem; font-weight: bold; }
    .cta { display: inline-block; padding: 0.75rem 2rem; background: #4f46e5; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
    .cta:hover { background: #4338ca; }
    .footer { margin-top: 3rem; color: #52525b; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${spec.name}</h1>
    <p>${spec.description}</p>
    <ul class="features">
      ${spec.features.map((f) => `<li>${f}</li>`).join("\n      ")}
    </ul>
    ${spec.subscription ? `<a class="cta" href="CHECKOUT_URL">Get Started - $${(spec.subscription.amount / 100).toFixed(2)}/${spec.subscription.interval}</a>` : ""}
    <p class="footer">Launched with Tandem</p>
  </div>
</body>
</html>`;

  const workerScript = `export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, name: "${spec.name}" });
    }
    return new Response(\`${landingHtml.replace(/`/g, "\\`")}\`, {
      headers: { "Content-Type": "text/html" },
    });
  }
};`;

  // Upload worker via the Workers API
  const formData = new FormData();
  formData.append("index.js", new Blob([workerScript], { type: "application/javascript+module" }), "index.js");
  formData.append("metadata", JSON.stringify({
    main_module: "index.js",
    compatibility_date: "2026-09-28",
  }));

  const uploadRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerName}`,
    {
      method: "PUT",
      headers: { "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      body: formData,
    }
  );
  const uploadData = await uploadRes.json() as { success: boolean; errors: any[] };
  if (!uploadData.success) {
    throw new Error(`Worker upload failed: ${JSON.stringify(uploadData.errors)}`);
  }

  // Enable workers.dev subdomain
  await cfApi(env, `/workers/scripts/${workerName}/subdomain`, "POST", { enabled: true });

  const workerUrl = `https://${workerName}.${env.CLOUDFLARE_ACCOUNT_ID.slice(0, 8)}.workers.dev`;

  return { workerUrl, workerName };
}
```

- [ ] **Step 2: Wire infra agent into orchestrator.ts**

Replace the infra stub in `executeAgents`:

```typescript
import { runInfraAgent } from "../agents/infra";

// Replace the infra block:
(async () => {
  await updateRun("infra", "running");
  try {
    const result = await runInfraAgent(projectId, spec, env);
    await env.DB.prepare("UPDATE projects SET worker_url = ? WHERE id = ?").bind(result.workerUrl, projectId).run();
    await updateRun("infra", "completed", JSON.stringify(result));
  } catch (err: any) {
    await updateRun("infra", "failed", null, err.message);
  }
})(),
```

- [ ] **Step 3: Set Cloudflare secrets**

```bash
npx wrangler secret put CLOUDFLARE_API_TOKEN --name tandem
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --name tandem
```

- [ ] **Step 4: Build, deploy, test infra provisioning**

```bash
npm run deploy
```

Test: submit a brief, approve, verify a real Worker appears at `*.workers.dev`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: infra agent - provisions real Cloudflare Workers"
```

---

### Task 5: Payments Agent (Stripe)

**Files:**
- Create: `worker/agents/payments.ts`
- Modify: `worker/routes/orchestrator.ts` (wire payments agent)

**Interfaces:**
- Consumes: `ProjectSpec` from Task 3, `Env` from Task 1
- Produces: `runPaymentsAgent(projectId, spec, env): Promise<{ checkoutUrl: string; customerId: string; productId: string }>` that creates real Stripe objects

- [ ] **Step 1: Create worker/agents/payments.ts**

```typescript
import type { Env } from "../types";
import type { ProjectSpec } from "./planner";
import Stripe from "stripe";

interface PaymentsResult {
  customerId: string;
  productId: string;
  priceId: string;
  checkoutUrl: string;
}

export async function runPaymentsAgent(projectId: string, spec: ProjectSpec, env: Env): Promise<PaymentsResult> {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const customer = await stripe.customers.create({
    name: spec.name,
    metadata: { tandem_project_id: projectId, source: "tandem" },
  });

  const product = await stripe.products.create({
    name: spec.name,
    description: spec.description,
    metadata: { tandem_project_id: projectId },
  });

  let price: Stripe.Price;
  if (spec.subscription) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: spec.subscription.amount,
      currency: spec.subscription.currency,
      recurring: { interval: spec.subscription.interval },
    });
  } else if (spec.oneTimePrice) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: spec.oneTimePrice,
      currency: "usd",
    });
  } else {
    return { customerId: customer.id, productId: product.id, priceId: "", checkoutUrl: "" };
  }

  const session = await stripe.checkout.sessions.create({
    mode: spec.subscription ? "subscription" : "payment",
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: "https://tandem.build/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://tandem.build/cancel",
    customer: customer.id,
    metadata: { tandem_project_id: projectId },
  });

  return {
    customerId: customer.id,
    productId: product.id,
    priceId: price.id,
    checkoutUrl: session.url || "",
  };
}
```

- [ ] **Step 2: Wire payments agent into orchestrator.ts**

Replace the payments stub:

```typescript
import { runPaymentsAgent } from "../agents/payments";

// Replace the payments block:
(async () => {
  await updateRun("payments", "running");
  try {
    const result = await runPaymentsAgent(projectId, spec, env);
    await env.DB.prepare(
      "UPDATE projects SET stripe_checkout_url = ?, stripe_customer_id = ?, stripe_product_id = ? WHERE id = ?"
    ).bind(result.checkoutUrl, result.customerId, result.productId, projectId).run();
    await updateRun("payments", "completed", JSON.stringify(result));
  } catch (err: any) {
    await updateRun("payments", "failed", null, err.message);
  }
})(),
```

- [ ] **Step 3: Set Stripe secret**

```bash
npx wrangler secret put STRIPE_SECRET_KEY --name tandem
```

- [ ] **Step 4: Build, deploy, test Stripe provisioning**

```bash
npm run deploy
```

Test: submit a brief with a price, approve, verify a real Stripe checkout link works.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: payments agent - creates real Stripe products + checkout"
```

---

### Task 6: Comms Agent (Postmark) + Deployer Agent

**Files:**
- Create: `worker/agents/comms.ts`
- Create: `worker/agents/deployer.ts`
- Modify: `worker/routes/orchestrator.ts` (wire both agents, update landing page with checkout URL)

**Interfaces:**
- Consumes: `ProjectSpec` from Task 3, `Env` from Task 1, infra + payments results from Tasks 4-5
- Produces: `runCommsAgent(projectId, spec, env): Promise<{ emailSent: boolean }>`, `runDeployerAgent(projectId, spec, checkoutUrl, env): Promise<void>` (redeploys Worker with real checkout URL baked in)

- [ ] **Step 1: Create worker/agents/comms.ts**

```typescript
import type { Env } from "../types";
import type { ProjectSpec } from "./planner";

interface CommsResult {
  emailSent: boolean;
}

export async function runCommsAgent(projectId: string, spec: ProjectSpec, env: Env): Promise<CommsResult> {
  if (!spec.welcomeEmail) return { emailSent: false };

  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": env.POSTMARK_API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      From: "hello@boxfordpartners.com",
      To: "patrick@boxfordpartners.com",
      Subject: `[Tandem Demo] ${spec.welcomeEmail.subject}`,
      TextBody: spec.welcomeEmail.body,
      MessageStream: "outbound",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Postmark error: ${err}`);
  }

  return { emailSent: true };
}
```

- [ ] **Step 2: Create worker/agents/deployer.ts**

```typescript
import type { Env } from "../types";
import type { ProjectSpec } from "./planner";

export async function runDeployerAgent(
  projectId: string,
  spec: ProjectSpec,
  checkoutUrl: string,
  workerName: string,
  env: Env
): Promise<void> {
  // Redeploy the landing page with the real Stripe checkout URL
  const landingHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0a; color: #fafafa; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 600px; padding: 2rem; text-align: center; }
    h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem; }
    p { color: #a1a1aa; font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem; }
    .features { text-align: left; margin: 2rem 0; }
    .features li { color: #d4d4d8; padding: 0.5rem 0; list-style: none; }
    .features li::before { content: "\\2713"; color: #818cf8; margin-right: 0.75rem; font-weight: bold; }
    .cta { display: inline-block; padding: 0.75rem 2rem; background: #4f46e5; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: 600; transition: background 0.2s; }
    .cta:hover { background: #4338ca; }
    .footer { margin-top: 3rem; color: #52525b; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${spec.name}</h1>
    <p>${spec.description}</p>
    <ul class="features">
      ${spec.features.map((f) => `<li>${f}</li>`).join("\n      ")}
    </ul>
    ${checkoutUrl ? `<a class="cta" href="${checkoutUrl}">Get Started${spec.subscription ? ` - $${(spec.subscription.amount / 100).toFixed(2)}/${spec.subscription.interval}` : ""}</a>` : ""}
    <p class="footer">Launched with Tandem</p>
  </div>
</body>
</html>`;

  const workerScript = `export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, name: "${spec.name}" });
    }
    return new Response(\`${landingHtml.replace(/`/g, "\\`")}\`, {
      headers: { "Content-Type": "text/html" },
    });
  }
};`;

  const formData = new FormData();
  formData.append("index.js", new Blob([workerScript], { type: "application/javascript+module" }), "index.js");
  formData.append("metadata", JSON.stringify({
    main_module: "index.js",
    compatibility_date: "2026-09-28",
  }));

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerName}`,
    {
      method: "PUT",
      headers: { "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      body: formData,
    }
  );
  const data = await res.json() as { success: boolean; errors: any[] };
  if (!data.success) {
    throw new Error(`Redeploy failed: ${JSON.stringify(data.errors)}`);
  }
}
```

- [ ] **Step 3: Wire both agents into orchestrator.ts -- full version**

Replace the entire `executeAgents` function:

```typescript
import type { Env } from "../types";
import type { ProjectSpec } from "../agents/planner";
import { runInfraAgent } from "../agents/infra";
import { runPaymentsAgent } from "../agents/payments";
import { runCommsAgent } from "../agents/comms";
import { runDeployerAgent } from "../agents/deployer";

export async function executeAgents(projectId: string, spec: ProjectSpec, env: Env): Promise<void> {
  const updateRun = async (agent: string, status: string, output?: string, error?: string) => {
    const timeCol = status === "running" ? "started_at" : "completed_at";
    await env.DB.prepare(
      `UPDATE agent_runs SET status = ?, output = ?, error = ?, ${timeCol} = ? WHERE project_id = ? AND agent = ?`
    ).bind(status, output || null, error || null, new Date().toISOString(), projectId, agent).run();
  };

  let workerName = "";
  let checkoutUrl = "";

  // Phase 1: Infra + Payments + Comms in parallel
  const [infraResult, paymentsResult, commsResult] = await Promise.allSettled([
    (async () => {
      await updateRun("infra", "running");
      try {
        const result = await runInfraAgent(projectId, spec, env);
        workerName = result.workerName;
        await env.DB.prepare("UPDATE projects SET worker_url = ? WHERE id = ?").bind(result.workerUrl, projectId).run();
        await updateRun("infra", "completed", JSON.stringify(result));
        return result;
      } catch (err: any) {
        await updateRun("infra", "failed", null, err.message);
        throw err;
      }
    })(),
    (async () => {
      await updateRun("payments", "running");
      try {
        const result = await runPaymentsAgent(projectId, spec, env);
        checkoutUrl = result.checkoutUrl;
        await env.DB.prepare(
          "UPDATE projects SET stripe_checkout_url = ?, stripe_customer_id = ?, stripe_product_id = ? WHERE id = ?"
        ).bind(result.checkoutUrl, result.customerId, result.productId, projectId).run();
        await updateRun("payments", "completed", JSON.stringify(result));
        return result;
      } catch (err: any) {
        await updateRun("payments", "failed", null, err.message);
        throw err;
      }
    })(),
    (async () => {
      await updateRun("comms", "running");
      try {
        const result = await runCommsAgent(projectId, spec, env);
        await env.DB.prepare("UPDATE projects SET email_sent = ? WHERE id = ?").bind(result.emailSent ? 1 : 0, projectId).run();
        await updateRun("comms", "completed", JSON.stringify(result));
        return result;
      } catch (err: any) {
        await updateRun("comms", "failed", null, err.message);
        throw err;
      }
    })(),
  ]);

  // Phase 2: Deployer runs after infra + payments (needs workerName + checkoutUrl)
  await updateRun("deployer", "running");
  try {
    if (workerName && infraResult.status === "fulfilled") {
      await runDeployerAgent(projectId, spec, checkoutUrl, workerName, env);
    }
    await updateRun("deployer", "completed", JSON.stringify({ redeployed: !!workerName }));
  } catch (err: any) {
    await updateRun("deployer", "failed", null, err.message);
  }

  // Mark project as deployed
  const hasFailures = [infraResult, paymentsResult, commsResult].some((r) => r.status === "rejected");
  await env.DB.prepare(
    "UPDATE projects SET status = ? WHERE id = ?"
  ).bind(hasFailures ? "failed" : "deployed", projectId).run();
}
```

- [ ] **Step 4: Set Postmark secret**

```bash
npx wrangler secret put POSTMARK_API_KEY --name tandem
```

- [ ] **Step 5: Build, deploy, test full end-to-end flow**

```bash
npm run deploy
```

Test the complete flow: brief -> plan -> approve -> all 4 agents execute -> live site + checkout + email.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: comms + deployer agents, full end-to-end orchestration"
```

---

### Task 7: Brainbase Integration Layer

**Files:**
- Create: `worker/lib/brainbase.ts`
- Modify: `worker/routes/orchestrator.ts` (swap in Brainbase when available)

**Interfaces:**
- Consumes: `executeAgents` from Task 6, `Env` from Task 1
- Produces: `BrainbaseOrchestrator` class with `dispatch()` and `getStatus()` methods, pluggable into the orchestrator

- [ ] **Step 1: Create worker/lib/brainbase.ts**

This is the pluggable integration point. When the Brainbase SDK is available, this file gets replaced. Until then, it wraps the existing orchestration in a Brainbase-compatible interface.

```typescript
import type { Env } from "../types";
import type { ProjectSpec } from "../agents/planner";

export interface OrchestrationEvent {
  agent: string;
  status: "dispatched" | "running" | "completed" | "failed";
  timestamp: string;
  data?: any;
}

export interface Orchestrator {
  execute(projectId: string, spec: ProjectSpec, env: Env): Promise<void>;
}

// Placeholder: replace with Brainbase SDK when available
// import { BrainbaseClient } from "@brainbase/sdk";
//
// export function createBrainbaseOrchestrator(apiKey: string): Orchestrator {
//   const client = new BrainbaseClient({ apiKey });
//   return {
//     async execute(projectId, spec, env) {
//       const workflow = await client.workflows.create({ ... });
//       await workflow.run();
//     }
//   };
// }

export function createLocalOrchestrator(): Orchestrator {
  return {
    async execute(projectId, spec, env) {
      const { executeAgents } = await import("../routes/orchestrator");
      await executeAgents(projectId, spec, env);
    },
  };
}
```

- [ ] **Step 2: Update orchestrator to use the pluggable interface**

In `worker/routes/projects.ts`, update the execute endpoint:

```typescript
import { createLocalOrchestrator } from "../lib/brainbase";

// In the execute endpoint, replace the direct import with:
const orchestrator = createLocalOrchestrator();
c.executionCtx.waitUntil(orchestrator.execute(id, JSON.parse(project.spec as string), c.env));
```

- [ ] **Step 3: Add BRAINBASE_API_KEY to types.ts (optional)**

```typescript
// Add to Env interface:
BRAINBASE_API_KEY?: string;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: pluggable Brainbase orchestration layer"
```

---

### Task 8: Polish + Demo Prep

**Files:**
- Modify: `src/App.tsx` (add project history sidebar)
- Modify: `src/components/Chat.tsx` (timing display, reset for new project)
- Modify: `src/components/AgentStatusCard.tsx` (show output links)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Demo-ready application with timing, clickable result links, ability to run multiple projects

- [ ] **Step 1: Add timing to Chat.tsx**

In the `handleApprove` function, record start time. When results arrive, show elapsed:

```typescript
const startTime = useRef<number>(0);

// In handleApprove, after the API call:
startTime.current = Date.now();

// In the result message, add timing:
const elapsed = ((Date.now() - startTime.current) / 1000).toFixed(1);
content: `Your project is live (${elapsed}s):\n\n` + output.join("\n"),
```

- [ ] **Step 2: Add clickable links in result messages**

In `MessageBubble.tsx`, detect URLs and make them clickable:

```typescript
function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    part.match(/^https?:\/\//) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">{part}</a>
    ) : part
  );
}

// In the component:
<p className="text-sm whitespace-pre-wrap">{linkify(content)}</p>
```

- [ ] **Step 3: Add "New Project" reset**

In Chat.tsx, when phase is "done", show a button to start a new project:

```typescript
{phase === "done" && (
  <button
    onClick={() => { setPhase("idle"); setProjectId(null); }}
    className="text-xs text-indigo-400 hover:text-indigo-300 mt-2"
  >
    + Start another project
  </button>
)}
```

- [ ] **Step 4: Final build and deploy**

```bash
npm run deploy
```

- [ ] **Step 5: Test the full demo script**

Run through the exact demo script from the spec:
1. Type the Coastal Beans brief
2. Review the plan
3. Approve
4. Watch agents execute
5. Verify: live Worker URL, working Stripe checkout, email received

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: polish - timing, links, reset, demo-ready"
```
