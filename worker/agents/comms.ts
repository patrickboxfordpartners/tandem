import type { Env } from "../types";
import type { ProjectSpec } from "./planner";

interface CommsResult {
  emailSent: boolean;
}

function buildEmailHtml(spec: ProjectSpec): string {
  const accent = spec.design?.accent || "#6366f1";
  const isLight = spec.design?.theme === "light";
  const bg = isLight ? "#fafaf9" : "#1a1a2e";
  const cardBg = isLight ? "#ffffff" : "#232340";
  const text = isLight ? "#1c1917" : "#e4e4e7";
  const muted = isLight ? "#78716c" : "#a1a1aa";
  const borderColor = isLight ? "#e7e5e4" : "#2d2d4a";

  const features = spec.features.slice(0, 4);

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:${cardBg};border-radius:16px;overflow:hidden;border:1px solid ${borderColor};">

<!-- Header -->
<tr><td style="background:${accent};padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.02em;">Welcome to ${spec.name}</h1>
</td></tr>

<!-- Body -->
<tr><td style="padding:40px;">
<p style="margin:0 0 20px;color:${text};font-size:16px;line-height:1.7;">
${spec.welcomeEmail?.body || `Thanks for joining ${spec.name}. We're excited to have you on board.`}
</p>

<!-- Features -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
${features.map((f) => `<tr><td style="padding:8px 0;color:${text};font-size:14px;line-height:1.5;">
<span style="color:${accent};font-weight:bold;margin-right:8px;">&#10003;</span> ${f}
</td></tr>`).join("")}
</table>

<!-- CTA Button -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
<tr><td align="center">
<a href="SITE_URL" style="display:inline-block;padding:14px 32px;background:${accent};color:#ffffff;text-decoration:none;border-radius:100px;font-weight:600;font-size:16px;">
Get Started
</a>
</td></tr>
</table>

<p style="margin:24px 0 0;color:${muted};font-size:13px;line-height:1.6;text-align:center;">
If you have any questions, just reply to this email.
</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 40px;border-top:1px solid ${borderColor};text-align:center;">
<p style="margin:0;color:${muted};font-size:12px;">
${spec.name} &middot; Launched with <a href="https://tandem.boxfordpartners.com" style="color:${accent};text-decoration:none;">Tandem</a>
</p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

export async function runCommsAgent(projectId: string, spec: ProjectSpec, env: Env): Promise<CommsResult> {
  if (!spec.welcomeEmail) return { emailSent: false };

  const htmlBody = buildEmailHtml(spec);

  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": env.POSTMARK_API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      From: "hello@boxfordpartners.com",
      To: "patrick@boxfordpartners.com",
      Subject: `[Tandem] ${spec.welcomeEmail.subject}`,
      HtmlBody: htmlBody,
      TextBody: spec.welcomeEmail.body,
      MessageStream: "outbound",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Postmark error: ${err}`);
  }

  return { emailSent: true };
}
