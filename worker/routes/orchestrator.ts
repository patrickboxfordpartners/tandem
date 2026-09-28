import type { Env } from "../types";
import type { ProjectSpec } from "../agents/planner";
import { runInfraAgent } from "../agents/infra";
import { runPaymentsAgent } from "../agents/payments";
import { runCommsAgent } from "../agents/comms";
import { runLegalAgent, type LegalResult } from "../agents/legal";
import { runSeoAgent, type SeoResult } from "../agents/seo";
import { runResearchAgent, type ResearchResult } from "../agents/research";
import { runContractsAgent, type ContractsResult } from "../agents/contracts";
import { runDeployerAgent } from "../agents/deployer";
import { postToSlack } from "../lib/slack";
import { BRAINBASE_ORCHESTRATION_ID } from "../lib/brainbase";

export async function executeAgents(projectId: string, spec: ProjectSpec, env: Env): Promise<void> {
  const updateRun = async (agent: string, status: string, output?: string, error?: string) => {
    const timeCol = status === "running" ? "started_at" : "completed_at";
    await env.DB.prepare(
      `UPDATE agent_runs SET status = ?, output = ?, error = ?, ${timeCol} = ? WHERE project_id = ? AND agent = ?`
    ).bind(status, output || null, error || null, new Date().toISOString(), projectId, agent).run();
  };

  const log = async (agent: string, message: string) => {
    const entry = { ts: new Date().toISOString(), agent, message };
    await env.DB.prepare(
      "UPDATE projects SET logs = json_insert(COALESCE(logs, '[]'), '$[#]', json(?)) WHERE id = ?"
    ).bind(JSON.stringify(entry), projectId).run();
  };

  let workerName = "";
  let workerUrl = "";
  let checkoutUrl = "";
  let legalDocs: LegalResult | null = null;
  let seoDocs: SeoResult | null = null;
  let researchBrief: ResearchResult | null = null;
  let contractDocs: ContractsResult | null = null;

  await log("orchestrator", `Brainbase orchestration ${BRAINBASE_ORCHESTRATION_ID.slice(0, 8)} dispatching 8 agents for "${spec.name}"`);
  await postToSlack(env, `Dispatching 7 agents for "${spec.name}"`);

  // Phase 1: All specialist agents in parallel
  const [infraResult, paymentsResult, commsResult, legalResult, , researchResult] = await Promise.allSettled([
    (async () => {
      await updateRun("infra", "running");
      await log("infra", `Creating Cloudflare Worker "tandem-${spec.slug}" with landing page + FAQ + llms.txt`);
      try {
        const result = await runInfraAgent(projectId, spec, env);
        workerName = result.workerName;
        workerUrl = result.workerUrl;
        await env.DB.prepare("UPDATE projects SET worker_url = ? WHERE id = ?").bind(result.workerUrl, projectId).run();
        await updateRun("infra", "completed", JSON.stringify(result));
        await log("infra", `Worker deployed at ${result.workerUrl} -- SSL active, llms.txt served`);
        return result;
      } catch (err: any) {
        await updateRun("infra", "failed", null, err.message);
        await log("infra", `Failed: ${err.message}`);
        throw err;
      }
    })(),
    (async () => {
      await updateRun("payments", "running");
      const priceDesc = spec.subscription
        ? `$${(spec.subscription.amount / 100).toFixed(2)}/${spec.subscription.interval} recurring`
        : spec.oneTimePrice ? `$${(spec.oneTimePrice / 100).toFixed(2)} one-time` : "no pricing";
      await log("payments", `Creating Stripe customer, product, price (${priceDesc}), checkout session`);
      try {
        const result = await runPaymentsAgent(projectId, spec, env);
        checkoutUrl = result.checkoutUrl;
        await env.DB.prepare(
          "UPDATE projects SET stripe_checkout_url = ?, stripe_customer_id = ?, stripe_product_id = ? WHERE id = ?"
        ).bind(result.checkoutUrl, result.customerId, result.productId, projectId).run();
        await updateRun("payments", "completed", JSON.stringify(result));
        await log("payments", `Stripe ready -- customer ${result.customerId.slice(0, 12)}..., checkout live`);
        return result;
      } catch (err: any) {
        await updateRun("payments", "failed", null, err.message);
        await log("payments", `Failed: ${err.message}`);
        throw err;
      }
    })(),
    (async () => {
      await updateRun("comms", "running");
      await log("comms", spec.welcomeEmail ? `Sending welcome email "${spec.welcomeEmail.subject}" via Postmark` : "Preparing email");
      try {
        const result = await runCommsAgent(projectId, spec, env);
        await env.DB.prepare("UPDATE projects SET email_sent = ? WHERE id = ?").bind(result.emailSent ? 1 : 0, projectId).run();
        await updateRun("comms", "completed", JSON.stringify(result));
        await log("comms", result.emailSent ? "Welcome email delivered via Postmark" : "No email configured");
        return result;
      } catch (err: any) {
        await updateRun("comms", "failed", null, err.message);
        await log("comms", `Failed: ${err.message}`);
        throw err;
      }
    })(),
    (async () => {
      await updateRun("legal", "running");
      await log("legal", `Generating privacy policy and terms of service for "${spec.name}" via Claude`);
      try {
        const result = await runLegalAgent(projectId, spec, env);
        legalDocs = result;
        await updateRun("legal", "completed", JSON.stringify({ generated: true }));
        await log("legal", "Privacy policy and terms of service generated -- will deploy as /privacy and /terms routes");
        return result;
      } catch (err: any) {
        await updateRun("legal", "failed", null, err.message);
        await log("legal", `Failed: ${err.message}`);
        throw err;
      }
    })(),
    (async () => {
      await updateRun("seo", "running");
      await log("seo", "Generating robots.txt, sitemap.xml, and OG meta tags");
      try {
        const result = runSeoAgent(spec, `https://tandem-${spec.slug}.patrick-54b.workers.dev`);
        seoDocs = result;
        await updateRun("seo", "completed", JSON.stringify({ generated: true }));
        await log("seo", "SEO infrastructure ready -- robots.txt allows AI crawlers, sitemap.xml with all routes");
        return result;
      } catch (err: any) {
        await updateRun("seo", "failed", null, err.message);
        await log("seo", `Failed: ${err.message}`);
        throw err;
      }
    })(),
    (async () => {
      await updateRun("research", "running");
      await log("research", `Analyzing competitive landscape for "${spec.name}" via Claude`);
      try {
        const result = await runResearchAgent(projectId, spec, env);
        researchBrief = result;
        await updateRun("research", "completed", JSON.stringify(result));
        await log("research", `Found ${result.competitors.length} competitors, ${result.quickWins.length} quick wins identified`);
        return result;
      } catch (err: any) {
        await updateRun("research", "failed", null, err.message);
        await log("research", `Failed: ${err.message}`);
        throw err;
      }
    })(),
    (async () => {
      await updateRun("contracts", "running");
      await log("contracts", `Drafting service agreement for "${spec.name}" via Claude`);
      try {
        const result = await runContractsAgent(projectId, spec, env);
        contractDocs = result;
        await updateRun("contracts", "completed", JSON.stringify({ generated: true }));
        await log("contracts", "Service agreement generated -- will deploy at /agreement route");
        return result;
      } catch (err: any) {
        await updateRun("contracts", "failed", null, err.message);
        await log("contracts", `Failed: ${err.message}`);
        throw err;
      }
    })(),
  ]);

  // Phase 2: Deployer rebuilds with all assets
  await updateRun("deployer", "running");
  try {
    if (workerName && infraResult.status === "fulfilled") {
      await log("deployer", `Redeploying "${workerName}" with checkout URL, legal docs, SEO, contracts, and all routes`);
      await runDeployerAgent(projectId, spec, checkoutUrl, workerName, env, legalDocs, seoDocs, contractDocs);
      await updateRun("deployer", "completed", JSON.stringify({ redeployed: true }));
      await log("deployer", "Final deploy complete -- /privacy, /terms, /agreement, /robots.txt, /sitemap.xml, /llms.txt all live");
    } else {
      await updateRun("deployer", "completed", JSON.stringify({ redeployed: false, reason: "infra failed" }));
      await log("deployer", "Skipped: infrastructure agent did not complete");
    }
  } catch (err: any) {
    await updateRun("deployer", "failed", null, err.message);
    await log("deployer", `Failed: ${err.message}`);
  }

  const criticalFailures = [infraResult, paymentsResult].filter((r) => r.status === "rejected");
  const finalStatus = criticalFailures.length > 0 ? "failed" : "deployed";
  await env.DB.prepare("UPDATE projects SET status = ? WHERE id = ?").bind(finalStatus, projectId).run();

  if (finalStatus === "deployed") {
    const routes = [workerUrl, "/privacy", "/terms", "/robots.txt", "/sitemap.xml", "/llms.txt"].join(", ");
    await log("orchestrator", `All 7 agents complete. Live at ${workerUrl} with routes: ${routes}`);
    await postToSlack(env, `Deployed: ${workerUrl} (7 agents, ${routes})`);
  } else {
    await log("orchestrator", "Deployment failed -- check agent errors above");
  }
}
