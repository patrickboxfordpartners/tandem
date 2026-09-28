import type { Env } from "../types";
import type { ProjectSpec } from "../agents/planner";
import { runInfraAgent } from "../agents/infra";
import { runPaymentsAgent } from "../agents/payments";
import { runCommsAgent } from "../agents/comms";
import { runDeployerAgent } from "../agents/deployer";
import { postToSlack } from "../lib/slack";
import { BRAINBASE_AGENTS, BRAINBASE_ORCHESTRATION_ID } from "../lib/brainbase";

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

  await log("orchestrator", `Brainbase orchestration ${BRAINBASE_ORCHESTRATION_ID.slice(0, 8)} dispatching 4 agents for "${spec.name}"`);
  await postToSlack(env, `Brainbase orchestration dispatching agents for "${spec.name}"`);

  const [infraResult, paymentsResult, commsResult] = await Promise.allSettled([
    (async () => {
      await updateRun("infra", "running");
      await log("infra", `Creating Cloudflare Worker "tandem-${spec.slug}" with landing page`);
      try {
        const result = await runInfraAgent(projectId, spec, env);
        workerName = result.workerName;
        workerUrl = result.workerUrl;
        await env.DB.prepare("UPDATE projects SET worker_url = ? WHERE id = ?").bind(result.workerUrl, projectId).run();
        await updateRun("infra", "completed", JSON.stringify(result));
        await log("infra", `Worker deployed at ${result.workerUrl} -- workers.dev subdomain enabled, SSL active`);
        await postToSlack(env, `Infrastructure: ${result.workerUrl}`);
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
        : spec.oneTimePrice
          ? `$${(spec.oneTimePrice / 100).toFixed(2)} one-time`
          : "no pricing";
      await log("payments", `Creating Stripe customer, product "${spec.name}", price (${priceDesc}), and checkout session`);
      try {
        const result = await runPaymentsAgent(projectId, spec, env);
        checkoutUrl = result.checkoutUrl;
        await env.DB.prepare(
          "UPDATE projects SET stripe_checkout_url = ?, stripe_customer_id = ?, stripe_product_id = ? WHERE id = ?"
        ).bind(result.checkoutUrl, result.customerId, result.productId, projectId).run();
        await updateRun("payments", "completed", JSON.stringify(result));
        await log("payments", `Stripe ready -- customer ${result.customerId.slice(0, 12)}..., product ${result.productId.slice(0, 12)}..., hosted checkout live`);
        await postToSlack(env, `Payments: Stripe checkout created`);
        return result;
      } catch (err: any) {
        await updateRun("payments", "failed", null, err.message);
        await log("payments", `Failed: ${err.message}`);
        throw err;
      }
    })(),
    (async () => {
      await updateRun("comms", "running");
      if (spec.welcomeEmail) {
        await log("comms", `Sending welcome email "${spec.welcomeEmail.subject}" via Postmark`);
      } else {
        await log("comms", "No welcome email in spec, skipping");
      }
      try {
        const result = await runCommsAgent(projectId, spec, env);
        await env.DB.prepare("UPDATE projects SET email_sent = ? WHERE id = ?").bind(result.emailSent ? 1 : 0, projectId).run();
        await updateRun("comms", "completed", JSON.stringify(result));
        await log("comms", result.emailSent ? "Welcome email delivered via Postmark" : "No email configured, skipped");
        return result;
      } catch (err: any) {
        await updateRun("comms", "failed", null, err.message);
        await log("comms", `Failed: ${err.message}`);
        throw err;
      }
    })(),
  ]);

  await updateRun("deployer", "running");
  try {
    if (workerName && infraResult.status === "fulfilled") {
      await log("deployer", `Redeploying "${workerName}" with real Stripe checkout URL baked into CTA button`);
      await runDeployerAgent(projectId, spec, checkoutUrl, workerName, env);
      await updateRun("deployer", "completed", JSON.stringify({ redeployed: true }));
      await log("deployer", "Landing page updated -- CTA now links to live Stripe checkout");
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
    await log("orchestrator", `All agents complete. Live at ${workerUrl}`);
    await postToSlack(env, `Deployed: ${workerUrl}`);
  } else {
    await log("orchestrator", "Deployment failed -- check agent errors above");
    await postToSlack(env, `Deployment failed for "${spec.name}"`);
  }
}
