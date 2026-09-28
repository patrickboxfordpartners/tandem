import type { Env } from "../types";
import type { ProjectSpec } from "../agents/planner";
import { runInfraAgent } from "../agents/infra";

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
