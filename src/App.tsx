import { useState } from "react";
import { Chat } from "./components/Chat";

export default function App() {
  const [projectCount, setProjectCount] = useState(0);

  return (
    <div className="h-dvh bg-zinc-950 text-zinc-100 flex flex-col relative overflow-hidden">
      {/* Gradient mesh background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="mesh-orb-1 absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="mesh-orb-2 absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-violet-600/12 blur-3xl" />
        <div className="mesh-orb-3 absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-emerald-600/8 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <header className="relative z-10 px-6 py-3.5 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/70 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/25">T</div>
        <h1 className="text-xl font-bold tracking-tight">Tandem</h1>
        <span className="text-xs font-light tracking-tight text-zinc-500">Your AI technical co-founder</span>
        <div className="ml-auto flex items-center gap-4">
          {projectCount > 0 && (
            <span className="text-xs text-zinc-600 font-mono">
              {projectCount} launched
            </span>
          )}
          <span className="hidden sm:inline text-[10px] text-zinc-600">Brainbase + Anthropic + Cloudflare + Stripe</span>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        <Chat onProjectComplete={() => setProjectCount((prev) => prev + 1)} />
      </div>
    </div>
  );
}
