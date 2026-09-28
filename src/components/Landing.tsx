import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, CreditCard, Mail, Globe, BrainCircuit } from "lucide-react";

const STEPS = [
  { icon: BrainCircuit, label: "Describe", text: "Tell Tandem your idea in plain English" },
  { icon: Zap, label: "Plan", text: "Claude analyzes your brief and builds a project spec" },
  { icon: Globe, label: "Deploy", text: "Agents provision infrastructure on Cloudflare" },
  { icon: CreditCard, label: "Monetize", text: "Stripe checkout is created automatically" },
  { icon: Mail, label: "Launch", text: "Welcome email sent, live site ready" },
];

const SPONSORS = [
  { name: "Brainbase", role: "Agent orchestration" },
  { name: "Anthropic", role: "AI intelligence" },
  { name: "Cloudflare", role: "Infrastructure" },
  { name: "Stripe", role: "Payments" },
];

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Mesh background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="mesh-orb-1 absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="mesh-orb-2 absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-violet-600/12 blur-3xl" />
        <div className="mesh-orb-3 absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-emerald-600/8 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/25">T</div>
            <span className="text-xl font-bold tracking-tight">Tandem</span>
          </div>
          <button
            onClick={() => navigate("/app")}
            className="px-4 py-2 rounded-full text-sm font-medium bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 hover:border-indigo-500/40 transition-all"
          >
            Launch App
          </button>
        </nav>

        {/* Hero */}
        <section className="text-center px-6 pt-20 pb-16 max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-8">
            Startup Speedrun Hackathon 2026
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 bg-gradient-to-br from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            Your AI Technical Co-Founder
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-xl mx-auto mb-10">
            Describe a business idea. Tandem provisions real infrastructure, sets up payments, configures email, and deploys a working product. All in under two minutes.
          </p>
          <button
            onClick={() => navigate("/app")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500 transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
          >
            Build Something <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-4 text-xs text-zinc-600">No account required. Real infrastructure deployed.</p>
        </section>

        {/* How it works */}
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <h2 className="text-center text-2xl font-bold tracking-tight mb-12 text-zinc-200">
            Idea to live product in 5 steps
          </h2>
          <div className="grid sm:grid-cols-5 gap-4">
            {STEPS.map((step, i) => (
              <div key={i} className="text-center p-4 rounded-2xl bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 hover:border-indigo-500/30 transition-all">
                <div className="mx-auto h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3">
                  <step.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">{step.label}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What gets built */}
        <section className="px-6 py-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-4 text-zinc-200">What Tandem deploys</h2>
          <p className="text-zinc-500 mb-10">Every project gets real, production infrastructure</p>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {[
              { title: "Cloudflare Worker", desc: "Live site on a workers.dev subdomain with SSL" },
              { title: "Stripe Checkout", desc: "Customer, product, price, and hosted checkout session" },
              { title: "Welcome Email", desc: "Branded email via Postmark to your first user" },
              { title: "Landing Page", desc: "Premium design with gradient mesh, features, and pricing" },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-2xl bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30">
                <p className="text-sm font-semibold text-zinc-100 mb-1">{item.title}</p>
                <p className="text-xs text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sponsors */}
        <section className="px-6 py-12 max-w-3xl mx-auto">
          <p className="text-center text-xs text-zinc-600 uppercase tracking-widest mb-6">Built with</p>
          <div className="flex justify-center gap-8 flex-wrap">
            {SPONSORS.map((s) => (
              <div key={s.name} className="text-center">
                <p className="text-sm font-semibold text-zinc-300">{s.name}</p>
                <p className="text-[10px] text-zinc-600">{s.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center px-6 pt-8 pb-20">
          <button
            onClick={() => navigate("/app")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500 transition-all shadow-xl shadow-indigo-500/25"
          >
            Try Tandem Now <ArrowRight className="h-4 w-4" />
          </button>
        </section>

        <footer className="text-center py-8 border-t border-zinc-800/60 text-xs text-zinc-600">
          Built by Boxford Partners for Startup Speedrun 2026
        </footer>
      </div>
    </div>
  );
}
