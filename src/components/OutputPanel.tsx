import { useRef, useEffect } from "react";
import type { ProjectState } from "../App";
import { useTheme } from "../App";
import { Globe, CreditCard, Mail, Server, ExternalLink, BrainCircuit, Terminal, CheckCircle2, Circle, Loader2, Bot, FileText } from "lucide-react";

const AGENT_LABELS: Record<string, string> = {
  infra: "Infrastructure",
  payments: "Payments",
  comms: "Email",
  legal: "Legal",
  seo: "SEO",
  research: "Research",
  contracts: "Contracts",
  deployer: "Deployer",
  orchestrator: "Orchestrator",
};

interface ChecklistItem {
  label: string;
  status: "pending" | "active" | "done";
  detail?: string;
}

function getChecklist(state: ProjectState): ChecklistItem[] {
  const phase = state.phase;
  const runs = state.runs || [];
  const agentStatus = (name: string) => runs.find((r) => r.agent === name)?.status;

  return [
    {
      label: "Define your idea",
      status: phase === "idle" ? "active" : "done",
      detail: phase === "idle" ? "Tell us what you want to build" : undefined,
    },
    {
      label: "Clarify requirements",
      status: phase === "chatting" ? "active" : phase === "idle" ? "pending" : "done",
      detail: phase === "chatting" ? "Answering co-founder questions" : undefined,
    },
    {
      label: "Review and approve plan",
      status: phase === "planning" || phase === "approval" ? "active" : ["executing", "done"].includes(phase) ? "done" : "pending",
    },
    {
      label: "Provision infrastructure",
      status: agentStatus("infra") === "completed" ? "done" : agentStatus("infra") === "running" ? "active" : phase === "executing" ? "pending" : "pending",
      detail: agentStatus("infra") === "completed" ? "Cloudflare Worker live" : agentStatus("infra") === "running" ? "Creating Worker and subdomain" : undefined,
    },
    {
      label: "Configure payments",
      status: agentStatus("payments") === "completed" ? "done" : agentStatus("payments") === "running" ? "active" : phase === "executing" ? "pending" : "pending",
      detail: agentStatus("payments") === "completed" ? "Stripe checkout ready" : agentStatus("payments") === "running" ? "Creating product and checkout" : undefined,
    },
    {
      label: "Set up email",
      status: agentStatus("comms") === "completed" ? "done" : agentStatus("comms") === "running" ? "active" : phase === "executing" ? "pending" : "pending",
      detail: agentStatus("comms") === "completed" ? "Welcome email sent" : agentStatus("comms") === "running" ? "Sending via Postmark" : undefined,
    },
    {
      label: "Generate legal docs",
      status: agentStatus("legal") === "completed" ? "done" : agentStatus("legal") === "running" ? "active" : phase === "executing" ? "pending" : "pending",
      detail: agentStatus("legal") === "completed" ? "Privacy policy + terms of service" : agentStatus("legal") === "running" ? "Drafting via Claude" : undefined,
    },
    {
      label: "SEO infrastructure",
      status: agentStatus("seo") === "completed" ? "done" : agentStatus("seo") === "running" ? "active" : phase === "executing" ? "pending" : "pending",
      detail: agentStatus("seo") === "completed" ? "robots.txt, sitemap.xml, OG tags" : undefined,
    },
    {
      label: "Competitive research",
      status: agentStatus("research") === "completed" ? "done" : agentStatus("research") === "running" ? "active" : phase === "executing" ? "pending" : "pending",
      detail: agentStatus("research") === "completed" ? "Landscape brief ready" : agentStatus("research") === "running" ? "Analyzing competitors via Claude" : undefined,
    },
    {
      label: "Draft service agreement",
      status: agentStatus("contracts") === "completed" ? "done" : agentStatus("contracts") === "running" ? "active" : phase === "executing" ? "pending" : "pending",
      detail: agentStatus("contracts") === "completed" ? "Agreement at /agreement" : agentStatus("contracts") === "running" ? "Drafting via Claude" : undefined,
    },
    {
      label: "Final deployment",
      status: agentStatus("deployer") === "completed" ? "done" : agentStatus("deployer") === "running" ? "active" : phase === "executing" ? "pending" : "pending",
      detail: agentStatus("deployer") === "completed" ? "All routes deployed" : undefined,
    },
    {
      label: "Live and ready",
      status: phase === "done" ? "done" : "pending",
      detail: phase === "done" ? "Your product is deployed" : undefined,
    },
  ];
}

function ChecklistRow({ item, isDark }: { item: ChecklistItem; isDark: boolean }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      {item.status === "done" ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
      ) : item.status === "active" ? (
        <Loader2 className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5 animate-spin" />
      ) : (
        <Circle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isDark ? "text-zinc-700" : "text-stone-300"}`} />
      )}
      <div className="min-w-0">
        <p className={`text-sm ${item.status === "done" ? "text-emerald-400" : item.status === "active" ? (isDark ? "text-zinc-100" : "text-zinc-900") : isDark ? "text-zinc-600" : "text-stone-400"}`}>
          {item.label}
        </p>
        {item.detail && (
          <p className={`text-[11px] ${isDark ? "text-zinc-500" : "text-stone-400"}`}>{item.detail}</p>
        )}
      </div>
    </div>
  );
}

export function OutputPanel({ state }: { state: ProjectState }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const hasRuns = state.runs && state.runs.length > 0;
  const hasLogs = state.logs && state.logs.length > 0;
  const hasAgents = state.recommendedAgents && state.recommendedAgents.length > 0;
  const hasDocs = state.recommendedDocs && state.recommendedDocs.length > 0;
  const isDone = state.phase === "done";
  const logEndRef = useRef<HTMLDivElement>(null);
  const card = isDark ? "bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30" : "bg-white backdrop-blur-sm border border-stone-200 shadow-sm";

  const checklist = getChecklist(state);
  const completedCount = checklist.filter((c) => c.status === "done").length;

  useEffect(() => {
    logEndRef.current?.scrollTo({ top: logEndRef.current.scrollHeight, behavior: "smooth" });
  }, [state.logs?.length]);

  return (
    <div className="p-5 space-y-4">
      {/* Launch checklist */}
      <div className={`rounded-xl ${card} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? "text-zinc-400" : "text-stone-500"}`}>Launch Checklist</span>
          <span className={`text-xs font-mono ${isDark ? "text-zinc-600" : "text-stone-400"}`}>{completedCount}/{checklist.length}</span>
        </div>
        {/* Progress bar */}
        <div className={`h-1.5 rounded-full mb-4 ${isDark ? "bg-zinc-700/50" : "bg-stone-200"}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
            style={{ width: `${(completedCount / checklist.length) * 100}%` }}
          />
        </div>
        <div className="space-y-0.5">
          {checklist.map((item, i) => (
            <ChecklistRow key={i} item={item} isDark={isDark} />
          ))}
        </div>
      </div>

      {/* Brainbase orchestration */}
      {state.orchestrationId && (
        <div className={`rounded-xl ${card} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="h-3.5 w-3.5 text-indigo-400" />
            <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? "text-zinc-400" : "text-stone-500"}`}>Brainbase Orchestration</span>
          </div>
          <p className={`text-[10px] font-mono ${isDark ? "text-zinc-600" : "text-stone-400"}`}>{state.orchestrationId}</p>
        </div>
      )}

      {/* Agent runs */}
      {hasRuns && (
        <div className={`rounded-xl ${card} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-3.5 w-3.5 text-indigo-400" />
            <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? "text-zinc-400" : "text-stone-500"}`}>Agent Team</span>
          </div>
          <div className={`divide-y ${isDark ? "divide-zinc-700/30" : "divide-stone-200/60"}`}>
            {state.runs!.map((run) => (
              <div key={run.agent} className="flex items-center gap-3 py-2">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  run.status === "running" ? "bg-amber-400 animate-pulse" :
                  run.status === "completed" ? "bg-emerald-400" :
                  run.status === "failed" ? "bg-red-400" : isDark ? "bg-zinc-700" : "bg-stone-300"
                }`} />
                <span className={`text-sm flex-1 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>{AGENT_LABELS[run.agent] || run.agent}</span>
                {run.brainbase_agent_id && (
                  <span className={`text-[10px] font-mono ${isDark ? "text-zinc-600" : "text-stone-400"}`}>{run.brainbase_agent_id.slice(0, 8)}</span>
                )}
                <span className={`text-[10px] font-mono ${
                  run.status === "running" ? "text-amber-400" :
                  run.status === "completed" ? "text-emerald-400" :
                  run.status === "failed" ? "text-red-400" : isDark ? "text-zinc-600" : "text-stone-400"
                }`}>{run.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical log */}
      {hasLogs && (
        <div className={`rounded-xl ${card} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? "text-zinc-400" : "text-stone-500"}`}>Technical Log</span>
          </div>
          <div ref={logEndRef} className="space-y-2 max-h-64 overflow-y-auto">
            {state.logs!.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <span className={`text-[10px] font-mono whitespace-nowrap mt-0.5 ${isDark ? "text-zinc-600" : "text-stone-400"}`}>
                  {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] text-indigo-400 font-medium">{AGENT_LABELS[entry.agent] || entry.agent}</span>
                  <p className={`text-[11px] leading-relaxed break-words ${isDark ? "text-zinc-400" : "text-stone-500"}`}>{entry.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {isDone && (
        <div className="space-y-3">
          {state.workerUrl && (
            <a
              href={state.workerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all group"
            >
              <Globe className="h-4 w-4 text-emerald-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-400">Live Site</p>
                <p className={`text-[10px] truncate ${isDark ? "text-zinc-500" : "text-stone-400"}`}>{state.workerUrl}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
            </a>
          )}

          {state.checkoutUrl && (
            <a
              href={state.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all group"
            >
              <CreditCard className="h-4 w-4 text-violet-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-violet-400">Stripe Checkout</p>
                <p className={`text-[10px] truncate ${isDark ? "text-zinc-500" : "text-stone-400"}`}>Live checkout session</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-violet-400/50 group-hover:text-violet-400 transition-colors" />
            </a>
          )}

          {state.emailSent && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Mail className="h-4 w-4 text-indigo-400" />
              <div>
                <p className="text-xs font-medium text-indigo-400">Welcome Email</p>
                <p className={`text-[10px] ${isDark ? "text-zinc-500" : "text-stone-400"}`}>Sent via Postmark</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommended Backend Agents */}
      {hasAgents && (
        <div className={`rounded-xl ${card} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-3.5 w-3.5 text-violet-400" />
            <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? "text-zinc-400" : "text-stone-500"}`}>Recommended Agents</span>
          </div>
          <p className={`text-[11px] mb-3 ${isDark ? "text-zinc-500" : "text-stone-400"}`}>
            Backend agents your product will need as it grows:
          </p>
          <div className="space-y-3">
            {state.recommendedAgents!.map((agent, i) => (
              <div key={i}>
                <p className={`text-sm font-medium ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>{agent.name}</p>
                <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-stone-500"}`}>{agent.purpose}</p>
                <p className={`text-[10px] ${isDark ? "text-zinc-600" : "text-stone-400"}`}>Triggers: {agent.triggers}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Documentation */}
      {hasDocs && (
        <div className={`rounded-xl ${card} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? "text-zinc-400" : "text-stone-500"}`}>Documentation Plan</span>
          </div>
          <div className="space-y-2">
            {state.recommendedDocs!.map((doc, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${isDark ? "text-zinc-600" : "text-stone-400"}`} />
                <div>
                  <p className={`text-sm ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>{doc.name}</p>
                  <p className={`text-[11px] ${isDark ? "text-zinc-500" : "text-stone-400"}`}>{doc.purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persistent Memory CTA */}
      {isDone && (
        <div className={`rounded-xl p-4 border ${isDark ? "bg-indigo-500/5 border-indigo-500/20" : "bg-indigo-50 border-indigo-200"}`}>
          <p className={`text-sm font-medium mb-1.5 ${isDark ? "text-indigo-300" : "text-indigo-700"}`}>Keep your co-founder's memory</p>
          <p className={`text-[11px] leading-relaxed mb-3 ${isDark ? "text-zinc-400" : "text-stone-500"}`}>
            Your technical co-founder needs persistent memory to grow with your business. Every decision, every pivot, every customer insight should carry forward. Without it, you're starting from scratch every conversation.
          </p>
          <a
            href="https://mitosis.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Connect Mitosis Labs for persistent memory <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
