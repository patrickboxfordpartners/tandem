import type { ProjectSpec } from "../agents/planner";

export function buildLandingHtml(spec: ProjectSpec, checkoutUrl?: string): string {
  const price = spec.subscription
    ? `$${(spec.subscription.amount / 100).toFixed(2)}/${spec.subscription.interval}`
    : spec.oneTimePrice
      ? `$${(spec.oneTimePrice / 100).toFixed(2)}`
      : "Free";

  const ctaHref = checkoutUrl || "CHECKOUT_URL";
  const ctaText = spec.subscription || spec.oneTimePrice
    ? `Get Started - ${price}`
    : "Get Started Free";

  const featureIcons = [
    "\u{1F680}", "\u{2728}", "\u{1F4CA}", "\u{1F512}", "\u{26A1}", "\u{1F4AC}",
    "\u{1F3AF}", "\u{1F4A1}", "\u{1F527}", "\u{1F4E6}",
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(spec.name)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#09090b;color:#fafafa;min-height:100vh;overflow-x:hidden}
.mesh{position:fixed;inset:0;pointer-events:none;z-index:0}
.orb{position:absolute;border-radius:50%;filter:blur(100px)}
.orb-1{width:600px;height:600px;background:rgba(99,102,241,.12);top:-200px;left:-100px;animation:f1 20s ease-in-out infinite}
.orb-2{width:500px;height:500px;background:rgba(139,92,246,.08);bottom:-100px;right:-100px;animation:f2 25s ease-in-out infinite}
.orb-3{width:400px;height:400px;background:rgba(16,185,129,.06);top:40%;left:50%;animation:f1 30s ease-in-out infinite reverse}
@keyframes f1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.05)}}
@keyframes f2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-20px,15px) scale(1.08)}}
.grid-bg{position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:60px 60px;pointer-events:none;z-index:0}
.content{position:relative;z-index:1}
.hero{min-height:80vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:4rem 2rem}
.hero-inner{max-width:680px}
.badge{display:inline-block;padding:.35rem 1rem;border-radius:100px;font-size:.75rem;font-weight:500;letter-spacing:.05em;text-transform:uppercase;background:rgba(99,102,241,.15);color:#818cf8;border:1px solid rgba(99,102,241,.2);margin-bottom:2rem}
h1{font-size:clamp(2.5rem,6vw,4rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:1.5rem;background:linear-gradient(135deg,#fff 0%,#a5b4fc 50%,#818cf8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.tagline{font-size:1.25rem;color:#a1a1aa;line-height:1.7;max-width:520px;margin:0 auto 3rem}
.cta{display:inline-block;padding:1rem 2.5rem;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:100px;font-weight:600;font-size:1rem;transition:all .3s;box-shadow:0 8px 32px rgba(99,102,241,.3)}
.cta:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(99,102,241,.4)}
.features{padding:4rem 2rem 6rem;max-width:900px;margin:0 auto}
.features h2{text-align:center;font-size:1.5rem;font-weight:700;letter-spacing:-.02em;margin-bottom:3rem;color:#e4e4e7}
.feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem}
.feat{padding:1.5rem;border-radius:16px;background:rgba(39,39,42,.5);border:1px solid rgba(63,63,70,.4);backdrop-filter:blur(8px);transition:border-color .3s}
.feat:hover{border-color:rgba(99,102,241,.4)}
.feat-icon{font-size:1.5rem;margin-bottom:.75rem}
.feat-text{color:#d4d4d8;font-size:.95rem;line-height:1.6}
.pricing{text-align:center;padding:4rem 2rem 6rem}
.price-tag{font-size:3rem;font-weight:800;letter-spacing:-.03em;margin-bottom:.5rem;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.price-sub{color:#71717a;font-size:.9rem;margin-bottom:2rem}
footer{text-align:center;padding:3rem 2rem;border-top:1px solid rgba(39,39,42,.6);color:#52525b;font-size:.8rem}
footer a{color:#6366f1;text-decoration:none}
</style>
</head>
<body>
<div class="mesh"><div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div></div>
<div class="grid-bg"></div>
<div class="content">
<section class="hero">
<div class="hero-inner">
<div class="badge">Now Live</div>
<h1>${esc(spec.name)}</h1>
<p class="tagline">${esc(spec.description)}</p>
<a class="cta" href="${esc(ctaHref)}">${esc(ctaText)}</a>
</div>
</section>
<section class="features">
<h2>Everything you need</h2>
<div class="feat-grid">
${spec.features.map((f, i) => `<div class="feat"><div class="feat-icon">${featureIcons[i % featureIcons.length]}</div><div class="feat-text">${esc(f)}</div></div>`).join("\n")}
</div>
</section>
<section class="pricing">
<div class="price-tag">${esc(price)}</div>
<div class="price-sub">Cancel anytime. No hidden fees.</div>
<a class="cta" href="${esc(ctaHref)}">${esc(ctaText)}</a>
</section>
<footer>Launched with <a href="https://tandem.boxfordpartners.com">Tandem</a></footer>
</div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
