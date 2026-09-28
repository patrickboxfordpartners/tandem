import type { Env } from "../types";
import type { ProjectSpec } from "./planner";
import type { LegalResult } from "./legal";
import type { SeoResult } from "./seo";
import { buildLandingHtml } from "../lib/landing-template";

export async function runDeployerAgent(
  projectId: string,
  spec: ProjectSpec,
  checkoutUrl: string,
  workerName: string,
  env: Env,
  legal?: LegalResult | null,
  seo?: SeoResult | null,
): Promise<void> {
  const landingHtml = buildLandingHtml(spec, checkoutUrl);

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

  const accent = spec.design?.accent || "#6366f1";
  const isLight = spec.design?.theme === "light";
  const bg = isLight ? "#fafaf9" : "#09090b";
  const text = isLight ? "#1c1917" : "#fafafa";

  const docPageTemplate = (title: string, content: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} - ${spec.name}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,system-ui,sans-serif;background:${bg};color:${text};min-height:100vh;padding:4rem 2rem}
.container{max-width:700px;margin:0 auto}h1{font-size:2rem;font-weight:700;margin-bottom:2rem}
h2{font-size:1.2rem;font-weight:600;margin:2rem 0 .75rem}p{line-height:1.7;margin-bottom:1rem;opacity:.85}
ul{margin:0 0 1rem 1.5rem}li{margin-bottom:.5rem;line-height:1.6;opacity:.85}
a{color:${accent};text-decoration:none}.back{display:inline-block;margin-bottom:2rem;font-size:.9rem}</style>
</head><body><div class="container"><a class="back" href="/">&larr; Back to ${spec.name}</a>
<h1>${title}</h1>${content}</div></body></html>`;

  const privacyHtml = legal?.privacyPolicy
    ? docPageTemplate("Privacy Policy", legal.privacyPolicy)
    : docPageTemplate("Privacy Policy", "<p>Privacy policy coming soon.</p>");

  const termsHtml = legal?.termsOfService
    ? docPageTemplate("Terms of Service", legal.termsOfService)
    : docPageTemplate("Terms of Service", "<p>Terms of service coming soon.</p>");

  const robotsTxt = seo?.robotsTxt || "User-agent: *\nAllow: /";
  const sitemapXml = seo?.sitemapXml || "";

  const workerScript = `export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/api/health") return Response.json({ ok: true, name: ${JSON.stringify(spec.name)} });
    if (path === "/privacy") return new Response(${JSON.stringify(privacyHtml)}, { headers: { "Content-Type": "text/html" } });
    if (path === "/terms") return new Response(${JSON.stringify(termsHtml)}, { headers: { "Content-Type": "text/html" } });
    if (path === "/robots.txt") return new Response(${JSON.stringify(robotsTxt)}, { headers: { "Content-Type": "text/plain" } });
    if (path === "/sitemap.xml") return new Response(${JSON.stringify(sitemapXml)}, { headers: { "Content-Type": "application/xml" } });
    if (path === "/llms.txt" || path === "/.well-known/llms.txt") return new Response(${JSON.stringify(llmsTxt)}, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    return new Response(${JSON.stringify(landingHtml)}, { headers: { "Content-Type": "text/html" } });
  }
};`;

  const formData = new FormData();
  formData.append("index.js", new Blob([workerScript], { type: "application/javascript+module" }), "index.js");
  formData.append("metadata", JSON.stringify({ main_module: "index.js", compatibility_date: "2026-09-28" }));

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerName}`,
    { method: "PUT", headers: { "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}` }, body: formData }
  );
  const data = await res.json() as { success: boolean; errors: any[] };
  if (!data.success) throw new Error(`Redeploy failed: ${JSON.stringify(data.errors)}`);
}
