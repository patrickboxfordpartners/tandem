import { useState, useEffect, createContext, useContext } from "react";
import { Chat } from "./components/Chat";
import { OutputPanel } from "./components/OutputPanel";
import { Sun, Moon, PanelRightOpen, MessageSquare } from "lucide-react";

export interface ProjectState {
  workerUrl?: string;
  checkoutUrl?: string;
  emailSent?: boolean;
  name?: string;
  runs?: Array<{ agent: string; status: string; output?: string; brainbase_agent_id?: string }>;
  logs?: Array<{ ts: string; agent: string; message: string }>;
  orchestrationId?: string;
  recommendedAgents?: Array<{ name: string; purpose: string; triggers: string }>;
  recommendedDocs?: Array<{ name: string; purpose: string }>;
  phase: "idle" | "chatting" | "planning" | "executing" | "done";
}

export const ThemeContext = createContext<"dark" | "light">("dark");
export const useTheme = () => useContext(ThemeContext);

export default function App() {
  const [projectCount, setProjectCount] = useState(0);
  const [projectState, setProjectState] = useState<ProjectState>({ phase: "idle" });
  const [showOutput, setShowOutput] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("tandem-theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  useEffect(() => { localStorage.setItem("tandem-theme", theme); }, [theme]);
  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={theme}>
      <div className={isDark ? "bg-zinc-950 text-zinc-100" : "bg-stone-50 text-zinc-900"} style={{ height: "100dvh", overflow: "hidden" }}>
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className={`mesh-orb-1 absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl ${isDark ? "bg-indigo-600/15" : "bg-indigo-400/10"}`} />
          <div className={`mesh-orb-2 absolute top-1/3 -right-24 h-80 w-80 rounded-full blur-3xl ${isDark ? "bg-violet-600/12" : "bg-violet-400/8"}`} />
          <div className={`mesh-orb-3 absolute -bottom-24 left-1/3 h-72 w-72 rounded-full blur-3xl ${isDark ? "bg-emerald-600/8" : "bg-emerald-400/6"}`} />
        </div>

        <header className={`relative z-10 px-4 md:px-6 border-b backdrop-blur-md flex items-center gap-2 md:gap-3 ${isDark ? "border-zinc-800/60 bg-zinc-950/70" : "border-stone-200/80 bg-white/70"}`} style={{ height: 52 }}>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-500/25 flex-shrink-0">T</div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">Tandem</h1>
          <span className={`hidden sm:inline text-xs font-light ${isDark ? "text-zinc-500" : "text-stone-400"}`}>Your AI technical co-founder</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowOutput(!showOutput)} className={`md:hidden p-1.5 rounded-lg ${isDark ? "hover:bg-zinc-800 text-zinc-500" : "hover:bg-stone-200 text-stone-400"}`}>
              {showOutput ? <MessageSquare className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
            <span className={`hidden lg:inline text-[10px] ${isDark ? "text-zinc-600" : "text-stone-400"}`}>Brainbase + Anthropic + Cloudflare + Stripe</span>
            <button onClick={() => setTheme(isDark ? "light" : "dark")} className={`p-1.5 rounded-lg ${isDark ? "hover:bg-zinc-800 text-zinc-500" : "hover:bg-stone-200 text-stone-400"}`}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <style>{`
          .tandem-main { position: fixed; top: 52px; bottom: 0; left: 0; right: 0; display: flex; }
          .tandem-chat { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
          .tandem-output { display: none; height: 100%; overflow-y: auto; }
          .tandem-chat.mobile-hidden { display: none; }
          .tandem-output.mobile-visible { display: block; flex: 1; }
          @media (min-width: 768px) {
            .tandem-chat { width: 380px !important; display: flex !important; border-right: 1px solid ${isDark ? "rgba(63,63,70,0.4)" : "rgba(214,211,209,0.6)"}; }
            .tandem-output { display: block !important; flex: 1; }
          }
        `}</style>

        <div className="tandem-main z-10">
          <div className={`tandem-chat ${showOutput ? "mobile-hidden" : ""}`}>
            <Chat onProjectComplete={() => setProjectCount((p) => p + 1)} onStateChange={setProjectState} />
          </div>
          <div className={`tandem-output ${showOutput ? "mobile-visible" : ""}`}>
            <OutputPanel state={projectState} />
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
