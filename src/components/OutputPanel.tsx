import { useRef, useEffect } from "react";
import type { ProjectState } from "../App";
import { useTheme } from "../App";
import { Globe, CreditCard, Mail, Server, ExternalLink, BrainCircuit, Terminal, CheckCircle2, Circle, Loader2 } from "lucide-react";

const AGENT_LABELS: Record<string, string> = {
  infra: "Infrastructure",
  payments: "Payments",
  comms: "Email",
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
      label: "Final deployment",
      status: agentStatus("deployer") === "completed" ? "done" : agentStatus("deployer") === "running" ? "active" : phase === "executing" ? "pending" : "pending",
      detail: agentStatus("deployer") === "completed" ? "Landing page updated with checkout" : undefined,
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
  const isDone = state.phase === "done";
  const logEndRef = useRef<HTMLDivElement>(null);
  const card = isDark ? "bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30" : "bg-white backdrop-blur-sm border border-stone-200 shadow-sm";

  const checklist = getChecklist(state);
  const completedCount = checklist.filter((c) => c.status === "done").length;

  useEffect(() => {
    logEndRef.current?.scrollTo({ top: logEndRef.current.scrollHeight, behavior: "smooth" });
  }, [state.logs?.length]);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
    </div>
  );
}
