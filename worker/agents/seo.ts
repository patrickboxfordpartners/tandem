import type { ProjectSpec } from "./planner";

export interface SeoResult {
  robotsTxt: string;
  sitemapXml: string;
  ogTitle: string;
  ogDescription: string;
}

export function runSeoAgent(spec: ProjectSpec, workerUrl: string): SeoResult {
  const robotsTxt = [
    "User-agent: *",
    "Allow: /",
    "",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: GoogleOther",
    "Allow: /",
    "",
    `Sitemap: ${workerUrl}/sitemap.xml`,
  ].join("\n");

  const now = new Date().toISOString().split("T")[0];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${workerUrl}/</loc><lastmod>${now}</lastmod><priority>1.0</priority></url>
  <url><loc>${workerUrl}/privacy</loc><lastmod>${now}</lastmod><priority>0.3</priority></url>
  <url><loc>${workerUrl}/terms</loc><lastmod>${now}</lastmod><priority>0.3</priority></url>
</urlset>`;

  return {
    robotsTxt,
    sitemapXml,
    ogTitle: `${spec.name} - ${spec.description.slice(0, 60)}`,
    ogDescription: spec.description,
  };
}
