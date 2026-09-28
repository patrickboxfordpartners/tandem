import type { Env } from "../types";
import type { ProjectSpec } from "./planner";

interface CommsResult {
  emailSent: boolean;
}

export async function runCommsAgent(projectId: string, spec: ProjectSpec, env: Env): Promise<CommsResult> {
  if (!spec.welcomeEmail) return { emailSent: false };

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
      Subject: `[Tandem Demo] ${spec.welcomeEmail.subject}`,
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
