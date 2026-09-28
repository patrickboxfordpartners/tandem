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

  const isLight = spec.design?.theme === "light";
  const accent = spec.design?.accent || "#6366f1";

  const bg = isLight ? "#fafaf9" : "#09090b";
  const text = isLight ? "#1c1917" : "#fafafa";
  const muted = isLight ? "#78716c" : "#a1a1aa";
  const cardBg = isLight ? "rgba(255,255,255,0.8)" : "rgba(39,39,42,0.5)";
  const cardBorder = isLight ? "rgba(214,211,209,0.6)" : "rgba(63,63,70,0.4)";
  const orbOpacity = isLight ? "0.08" : "0.12";
  const gridOpacity = isLight ? "0.04" : "0.03";
  const gridColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)";
  const featureText = isLight ? "#44403c" : "#d4d4d8";
  const footerBorder = isLight ? "rgba(214,211,209,0.4)" : "rgba(39,39,42,0.6)";
  const footerText = isLight ? "#a8a29e" : "#52525b";
  const priceSub = isLight ? "#78716c" : "#71717a";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(spec.name)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:${bg};color:${text};min-height:100vh;overflow-x:hidden}
.mesh{position:fixed;inset:0;pointer-events:none;z-index:0}
.orb{position:absolute;border-radius:50%;filter:blur(100px)}
.orb-1{width:600px;height:600px;background:${accent};opacity:${orbOpacity};top:-200px;left:-100px;animation:f1 20s ease-in-out infinite}
.orb-2{width:500px;height:500px;background:${accent};opacity:${String(Number(orbOpacity) * 0.6)};bottom:-100px;right:-100px;animation:f2 25s ease-in-out infinite}
.orb-3{width:400px;height:400px;background:${accent};opacity:${String(Number(orbOpacity) * 0.4)};top:40%;left:50%;animation:f1 30s ease-in-out infinite reverse}
@keyframes f1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.05)}}
@keyframes f2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-20px,15px) scale(1.08)}}
.grid-bg{position:fixed;inset:0;background-image:linear-gradient(${gridColor} 1px,transparent 1px),linear-gradient(90deg,${gridColor} 1px,transparent 1px);background-size:60px 60px;pointer-events:none;z-index:0;opacity:${gridOpacity}}
.content{position:relative;z-index:1}
.hero{min-height:80vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:4rem 2rem}
.hero-inner{max-width:680px}
.badge{display:inline-block;padding:.35rem 1rem;border-radius:100px;font-size:.75rem;font-weight:500;letter-spacing:.05em;text-transform:uppercase;background:${accent}15;color:${accent};border:1px solid ${accent}30;margin-bottom:2rem}
h1{font-size:clamp(2.5rem,6vw,4rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:1.5rem}
.tagline{font-size:1.25rem;color:${muted};line-height:1.7;max-width:520px;margin:0 auto 3rem}
.cta{display:inline-block;padding:1rem 2.5rem;background:${accent};color:#fff;text-decoration:none;border-radius:100px;font-weight:600;font-size:1rem;transition:all .3s;box-shadow:0 8px 32px ${accent}40}
.cta:hover{transform:translateY(-2px);box-shadow:0 12px 40px ${accent}50}
.features{padding:4rem 2rem 6rem;max-width:900px;margin:0 auto}
.features h2{text-align:center;font-size:1.5rem;font-weight:700;letter-spacing:-.02em;margin-bottom:3rem}
.feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem}
.feat{padding:1.5rem;border-radius:16px;background:${cardBg};border:1px solid ${cardBorder};backdrop-filter:blur(8px);transition:border-color .3s}
.feat:hover{border-color:${accent}60}
.feat-icon{font-size:1.5rem;margin-bottom:.75rem}
.feat-text{color:${featureText};font-size:.95rem;line-height:1.6}
.pricing{text-align:center;padding:4rem 2rem 6rem}
.price-tag{font-size:3rem;font-weight:800;letter-spacing:-.03em;margin-bottom:.5rem;color:${accent}}
.price-sub{color:${priceSub};font-size:.9rem;margin-bottom:2rem}
footer{text-align:center;padding:3rem 2rem;border-top:1px solid ${footerBorder};color:${footerText};font-size:.8rem}
footer a{color:${accent};text-decoration:none}
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
