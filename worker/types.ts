export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_WORKSPACE_ID?: string;
  STRIPE_SECRET_KEY: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  POSTMARK_API_KEY: string;
}
