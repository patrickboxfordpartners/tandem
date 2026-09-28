# Tandem -- Your AI Technical Co-Founder

## One-liner

Describe a business idea. Tandem provisions the infrastructure, sets up payments, configures email, deploys a working product, and gives you live URLs. Everything a technical co-founder does in the first sprint, done in minutes.

## Origin

Born from Boxford Partners, where Patrick Mitchell has launched 10+ SaaS products (TitleWise, StrideTC, ReviewSniper, and more). Every single one required the same first sprint: Cloudflare Workers, Stripe, Postmark, database, deploy. Tandem is that sprint, automated.

## Market

Non-technical founders sitting on ideas who can't get past the "I need a developer" wall. Also: technical founders who are tired of the repetitive first-sprint setup. Also: agencies onboarding new clients.

## Hackathon Context

- **Event**: Startup Speedrun Hackathon (Sep 28, 2026, Cloudflare HQ)
- **Sponsors**: Brainbase, Anthropic, Cloudflare, Stripe
- **Tracks**: Agentic Payments + Agents That Deploy Infrastructure + Autonomous Organizations (all three)
- **Build time**: 6 hours (9:30 AM - 3:30 PM)
- **Solo builder**

## Sponsor Integration

| Sponsor | Role | How |
|---------|------|-----|
| **Brainbase** | Agent orchestration backbone | Coordinates the agent team, manages task routing, state, agent-to-agent communication |
| **Anthropic** | Intelligence layer | Claude powers each agent's reasoning, planning, code generation |
| **Cloudflare** | Infrastructure being deployed + runtime | Workers, D1, R2, domains for launched projects. Tandem itself runs on Workers. |
| **Stripe** | Payment automation | Creates customers, products, prices, checkout sessions for each launched project |

All four sponsors deeply integrated, not decorative.

## Architecture

### System Overview

Tandem is a Cloudflare Worker (Hono) serving a chat-based SPA. The user describes a project in natural language. A Brainbase-orchestrated team of specialist agents parses the brief, creates a plan, and executes it -- provisioning real infrastructure, setting up real payments, deploying a real app.

### Agent Team

| Agent | Responsibility | External APIs |
|-------|---------------|---------------|
| **Planner** | Parses brief into structured project spec. Creates task graph. Assigns work to specialists. Tracks completion. Reports status. | Brainbase (orchestration), Claude (reasoning) |
| **Infra** | Provisions Cloudflare Worker + D1 database + R2 bucket. Configures subdomain routing. | Cloudflare API (Workers, D1, DNS) |
| **Payments** | Creates Stripe customer, product, price (recurring or one-time). Generates checkout link. Sets up webhook endpoint on the new Worker. | Stripe API |
| **Comms** | Configures email for the new project domain. Sends branded welcome email to the client. | Postmark API |
| **Deployer** | Generates starter app code from templates + project spec. Deploys to the provisioned Worker. | Cloudflare API (deploy), Claude (code gen) |

### Flow

```
User input (natural language brief)
  |
  v
Planner agent (Claude) -> structured project spec
  |
  v
Plan presented to user for approval
  |
  v
User approves
  |
  v
Brainbase dispatches tasks to specialist agents (parallel)
  |
  +---> Infra agent: provision Worker + D1 + R2 + subdomain
  +---> Payments agent: Stripe customer + product + checkout
  +---> Comms agent: Postmark domain + welcome email
  |
  v (after infra ready)
  |
  +---> Deployer agent: generate + deploy starter app
  |
  v
All agents report completion -> Planner summarizes
  |
  v
User sees: live site URL, checkout link, email configured, welcome sent
```

### Tech Stack

- **Runtime**: Cloudflare Workers (Hono)
- **Frontend**: Vite + React SPA, Tailwind, minimal chat UI
- **Database**: D1 (stores projects, agent runs, deployment logs)
- **Orchestration**: Brainbase SDK
- **Intelligence**: Anthropic Claude (via Brainbase or direct)
- **Payments**: Stripe Node SDK
- **Email**: Postmark API
- **Infrastructure provisioning**: Cloudflare API (REST)

### Data Model (D1)

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brief TEXT NOT NULL,
  spec TEXT, -- JSON: parsed project specification
  status TEXT NOT NULL DEFAULT 'planning', -- planning, approved, provisioning, deployed, failed
  worker_url TEXT,
  stripe_checkout_url TEXT,
  stripe_customer_id TEXT,
  postmark_domain TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  agent TEXT NOT NULL, -- planner, infra, payments, comms, deployer
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  input TEXT, -- JSON
  output TEXT, -- JSON
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Demo Script (what judges see)

**Setup**: Tandem chat UI open on screen. Nothing pre-provisioned.

**The pitch** (30 seconds):
"I've launched 10 products. Every one started the same way -- two days of setup before I could write a line of product code. Tandem is your AI technical co-founder. Describe what you're building, and it handles the entire first sprint."

**The demo** (90 seconds):
1. Type: "I'm starting a coffee subscription business called Coastal Beans. I need a landing page, $15/month subscription checkout, and a welcome email for new subscribers."
2. Planner shows the plan: 5 tasks, estimated 60 seconds.
3. Approve. Agents execute with live status streaming.
4. Results appear:
   - Live site: coastalbeans.tandem.dev (or subdomain)
   - Stripe checkout: working link, $15/mo, click to verify
   - Welcome email: sent to a demo inbox
5. "This took 73 seconds. My last product took 2 days."

**The closer**:
"Tandem is a Boxford Partners spinoff. It's how I'll launch my next product, and it's how anyone can launch theirs. All four sponsors are running in production right now -- Brainbase coordinating the agents, Claude reasoning through the plan, Cloudflare hosting everything, Stripe processing real payments."

## 6-Hour Build Plan

| Hour | Focus | Deliverable |
|------|-------|-------------|
| 1 | Scaffold: Worker + SPA + D1 schema + Brainbase setup | Chat UI that sends messages to the backend |
| 2 | Planner agent: brief -> structured spec -> approval flow | User types brief, sees a plan, approves |
| 3 | Infra agent + Deployer agent: Cloudflare API provisioning + template deploy | Real Worker deployed with a live URL |
| 4 | Payments agent: Stripe customer + product + checkout link | Working checkout URL in the output |
| 5 | Comms agent + end-to-end flow: Postmark + full pipeline | Complete flow from brief to all 4 outputs |
| 6 | Polish, test full demo, prepare pitch | Clean demo, rehearsed pitch |

## Risk Mitigations

- **Brainbase SDK unfamiliar**: Research their docs in the first 30 min. If their SDK is too heavy to integrate in time, fall back to a lightweight orchestration layer on top of Claude tool-use, but frame it as "Brainbase-inspired coordination" and use their platform for monitoring/logging.
- **Cloudflare API provisioning is slow or rate-limited**: Pre-create a pool of Workers/D1 databases if needed, then "claim" them during demo. Less pure but guarantees the demo works.
- **6 hours is tight for 5 agents**: Prioritize Planner + Infra + Payments (3 agents covers all 3 tracks). Comms and Deployer are polish -- the site can be a minimal HTML page deployed directly rather than a generated app.
- **Demo fails live**: Have one pre-provisioned project as a fallback. Show the live provisioning attempt, and if it stalls, flip to "here's one I launched earlier" with real URLs.

## Success Criteria

1. A real Cloudflare Worker gets deployed during the demo
2. A real Stripe checkout link works during the demo
3. A real email gets sent during the demo
4. Brainbase visibly orchestrates the agent team
5. The whole thing takes under 2 minutes from brief to live
6. The pitch tells a founder story, not a tech story
