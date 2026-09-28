import type { Env } from "../types";
import type { ProjectSpec } from "../agents/planner";
import { runInfraAgent } from "../agents/infra";
import { runPaymentsAgent } from "../agents/payments";

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
      try {
        const result = await runInfraAgent(projectId, spec, env);
        await env.DB.prepare("UPDATE projects SET worker_url = ? WHERE id = ?").bind(result.workerUrl, projectId).run();
        await updateRun("infra", "completed", JSON.stringify(result));
      } catch (err: any) {
        await updateRun("infra", "failed", null, err.message);
      }
    })(),
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
