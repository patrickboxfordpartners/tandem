import type { Env } from "../types";
import type { ProjectSpec } from "./planner";

export async function runDeployerAgent(
  projectId: string,
  spec: ProjectSpec,
  checkoutUrl: string,
  workerName: string,
  env: Env
): Promise<void> {
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
    return new Response(\`${landingHtml.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`, {
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
