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

  let workerName = "";
  let workerUrl = "";
  let checkoutUrl = "";

  await postToSlack(env, `🚀 Brainbase orchestration ${BRAINBASE_ORCHESTRATION_ID.slice(0, 8)}... dispatching agents for "${spec.name}"`);

  // Phase 1: Infra + Payments + Comms in parallel
  const [infraResult, paymentsResult, commsResult] = await Promise.allSettled([
    (async () => {
      await updateRun("infra", "running");
      await postToSlack(env, "⚙️ Infrastructure agent starting...");
      try {
        const result = await runInfraAgent(projectId, spec, env);
        workerName = result.workerName;
        workerUrl = result.workerUrl;
        await env.DB.prepare("UPDATE projects SET worker_url = ? WHERE id = ?").bind(result.workerUrl, projectId).run();
        await updateRun("infra", "completed", JSON.stringify(result));
        await postToSlack(env, `✅ Infrastructure agent complete: ${result.workerUrl}`);
        return result;
      } catch (err: any) {
        await updateRun("infra", "failed", null, err.message);
        await postToSlack(env, `❌ Infrastructure agent failed: ${err.message}`);
        throw err;
      }
    })(),
    (async () => {
      await updateRun("payments", "running");
      await postToSlack(env, "💳 Payments agent starting...");
      try {
        const result = await runPaymentsAgent(projectId, spec, env);
        checkoutUrl = result.checkoutUrl;
        await env.DB.prepare(
          "UPDATE projects SET stripe_checkout_url = ?, stripe_customer_id = ?, stripe_product_id = ? WHERE id = ?"
        ).bind(result.checkoutUrl, result.customerId, result.productId, projectId).run();
        await updateRun("payments", "completed", JSON.stringify(result));
        await postToSlack(env, `✅ Payments agent complete: ${result.checkoutUrl}`);
        return result;
      } catch (err: any) {
        await updateRun("payments", "failed", null, err.message);
        await postToSlack(env, `❌ Payments agent failed: ${err.message}`);
        throw err;
      }
    })(),
    (async () => {
      await updateRun("comms", "running");
      await postToSlack(env, "📧 Comms agent starting...");
      try {
        const result = await runCommsAgent(projectId, spec, env);
        await env.DB.prepare("UPDATE projects SET email_sent = ? WHERE id = ?").bind(result.emailSent ? 1 : 0, projectId).run();
        await updateRun("comms", "completed", JSON.stringify(result));
        await postToSlack(env, result.emailSent ? "✅ Comms agent complete: email sent" : "⏭️ Comms agent complete: no email configured");
        return result;
      } catch (err: any) {
        await updateRun("comms", "failed", null, err.message);
        await postToSlack(env, `❌ Comms agent failed: ${err.message}`);
        throw err;
      }
    })(),
  ]);

  // Phase 2: Deployer runs after infra + payments (needs workerName + checkoutUrl)
  await updateRun("deployer", "running");
  await postToSlack(env, "🔄 Deployer agent starting...");
  try {
    if (workerName && infraResult.status === "fulfilled") {
      await runDeployerAgent(projectId, spec, checkoutUrl, workerName, env);
      await updateRun("deployer", "completed", JSON.stringify({ redeployed: true }));
      await postToSlack(env, "✅ Deployer agent complete: landing page updated with checkout URL");
    } else {
      await updateRun("deployer", "completed", JSON.stringify({ redeployed: false, reason: "infra failed" }));
      await postToSlack(env, "⏭️ Deployer agent skipped: infra agent failed");
    }
  } catch (err: any) {
    await updateRun("deployer", "failed", null, err.message);
    await postToSlack(env, `❌ Deployer agent failed: ${err.message}`);
  }

  // Determine final status
  const criticalFailures = [infraResult, paymentsResult].filter((r) => r.status === "rejected");
  const finalStatus = criticalFailures.length > 0 ? "failed" : "deployed";
  await env.DB.prepare("UPDATE projects SET status = ? WHERE id = ?").bind(finalStatus, projectId).run();

  // Post final summary to Slack
  if (finalStatus === "deployed") {
    const summary = [
      `🎉 Deployment complete for "${spec.name}"`,
      `🌐 Live site: ${workerUrl}`,
      checkoutUrl ? `💳 Checkout: ${checkoutUrl}` : "",
      commsResult.status === "fulfilled" && commsResult.value.emailSent ? "📧 Welcome email sent" : "",
    ].filter(Boolean).join("\n");
    await postToSlack(env, summary);
  } else {
    await postToSlack(env, `❌ Deployment failed for "${spec.name}"`);
  }
}
