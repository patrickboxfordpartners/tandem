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
  const [mobilePanel, setMobilePanel] = useState<"chat" | "output">("chat");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("tandem-theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    localStorage.setItem("tandem-theme", theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={theme}>
      <div className={`${isDark ? "bg-zinc-950 text-zinc-100" : "bg-stone-50 text-zinc-900"}`} style={{ height: "100dvh", overflow: "hidden" }}>
        {/* Gradient mesh background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className={`mesh-orb-1 absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl ${isDark ? "bg-indigo-600/15" : "bg-indigo-400/10"}`} />
          <div className={`mesh-orb-2 absolute top-1/3 -right-24 h-80 w-80 rounded-full blur-3xl ${isDark ? "bg-violet-600/12" : "bg-violet-400/8"}`} />
          <div className={`mesh-orb-3 absolute -bottom-24 left-1/3 h-72 w-72 rounded-full blur-3xl ${isDark ? "bg-emerald-600/8" : "bg-emerald-400/6"}`} />
          <div
            className={`absolute inset-0 ${isDark ? "opacity-[0.03]" : "opacity-[0.04]"}`}
            style={{
              backgroundImage: `linear-gradient(${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"} 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Header */}
        <header
          className={`relative z-10 px-4 md:px-6 border-b backdrop-blur-md flex items-center gap-2 md:gap-3 ${isDark ? "border-zinc-800/60 bg-zinc-950/70" : "border-stone-200/80 bg-white/70"}`}
          style={{ height: 52 }}
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-500/25 flex-shrink-0">T</div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">Tandem</h1>
          <span className={`hidden sm:inline text-xs font-light tracking-tight ${isDark ? "text-zinc-500" : "text-stone-400"}`}>Your AI technical co-founder</span>
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            {/* Mobile panel toggle */}
            <button
              onClick={() => setMobilePanel(mobilePanel === "chat" ? "output" : "chat")}
              className={`md:hidden p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-zinc-800 text-zinc-500" : "hover:bg-stone-200 text-stone-400"}`}
            >
              {mobilePanel === "chat" ? <PanelRightOpen className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </button>
            {projectCount > 0 && (
              <span className={`hidden sm:inline text-xs font-mono ${isDark ? "text-zinc-600" : "text-stone-400"}`}>
                {projectCount} launched
              </span>
            )}
            <span className={`hidden lg:inline text-[10px] ${isDark ? "text-zinc-600" : "text-stone-400"}`}>Brainbase + Anthropic + Cloudflare + Stripe</span>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-zinc-800 text-zinc-500" : "hover:bg-stone-200 text-stone-400"}`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Main area */}
        <div className="z-10" style={{ position: "fixed", top: 52, bottom: 0, left: 0, right: 0, display: "flex" }}>
          {/* Chat column -- full width on mobile, 380px on desktop */}
          <div
            className={`border-r ${isDark ? "border-zinc-800/40" : "border-stone-200/60"} ${mobilePanel === "chat" ? "flex" : "hidden"} md:flex`}
            style={{ width: "100%", maxWidth: "100%", height: "100%", flexDirection: "column", overflow: "hidden" }}
          >
            <div className="hidden md:block" style={{ width: 380, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <Chat
                onProjectComplete={() => setProjectCount((prev) => prev + 1)}
                onStateChange={setProjectState}
              />
            </div>
            <div className="md:hidden" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <Chat
                onProjectComplete={() => setProjectCount((prev) => prev + 1)}
                onStateChange={setProjectState}
              />
            </div>
          </div>
          {/* Output column -- hidden on mobile unless toggled, flex on desktop */}
          <div
            className={`${mobilePanel === "output" ? "block" : "hidden"} md:block`}
            style={{ flex: 1, height: "100%", overflowY: "auto" }}
          >
            <OutputPanel state={projectState} />
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
