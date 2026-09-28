import type { Env } from "../types";
import type { ProjectSpec } from "./planner";
import { buildLandingHtml } from "../lib/landing-template";

export async function runDeployerAgent(
  projectId: string,
  spec: ProjectSpec,
  checkoutUrl: string,
  workerName: string,
  env: Env
): Promise<void> {
  const landingHtml = buildLandingHtml(spec, checkoutUrl);

  const workerScript = `export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, name: ${JSON.stringify(spec.name)} });
    }
    return new Response(${JSON.stringify(landingHtml)}, {
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
