import type { Env } from "../types";
import type { ProjectSpec } from "./planner";
import { buildLandingHtml } from "../lib/landing-template";

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

  const subdomainInfo = await cfApi(env, "/workers/subdomain", "GET");
  const subdomain = subdomainInfo.subdomain || "patrick-54b";

  const landingHtml = buildLandingHtml(spec);

  const llmsTxt = [
    `# ${spec.name}`,
    `> ${spec.description}`,
    "",
    "## Features",
    ...spec.features.map((f) => `- ${f}`),
    "",
    ...(spec.faq?.length ? [
      "## FAQ",
      ...spec.faq.map((item) => `Q: ${item.q}\nA: ${item.a}\n`),
    ] : []),
    `Built with Tandem (tandem.boxfordpartners.com)`,
  ].join("\n");

  const workerScript = `export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, name: ${JSON.stringify(spec.name)} });
    }
    if (url.pathname === "/llms.txt" || url.pathname === "/.well-known/llms.txt") {
      return new Response(${JSON.stringify(llmsTxt)}, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
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

  await cfApi(env, `/workers/scripts/${workerName}/subdomain`, "POST", { enabled: true });

  const workerUrl = `https://${workerName}.${subdomain}.workers.dev`;

  return { workerUrl, workerName };
}
