import { useRef, useEffect } from "react";
import type { ProjectState } from "../App";
import { Globe, CreditCard, Mail, Server, ExternalLink, BrainCircuit, Terminal } from "lucide-react";

const PHASE_LABELS: Record<string, string> = {
  idle: "Waiting for your idea",
  chatting: "Gathering requirements",
  planning: "Building your plan",
  executing: "Deploying your product",
  done: "Deployed",
};

function AgentRow({ name, status, brainbaseId }: { name: string; status: string; brainbaseId?: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
        status === "running" ? "bg-amber-400 animate-pulse" :
        status === "completed" ? "bg-emerald-400" :
        status === "failed" ? "bg-red-400" : "bg-zinc-700"
      }`} />
      <span className="text-sm text-zinc-300 flex-1">{name}</span>
      {brainbaseId && (
        <span className="text-[10px] text-zinc-600 font-mono">{brainbaseId.slice(0, 8)}</span>
      )}
      <span className={`text-[10px] font-mono ${
        status === "running" ? "text-amber-400" :
        status === "completed" ? "text-emerald-400" :
        status === "failed" ? "text-red-400" : "text-zinc-600"
      }`}>{status}</span>
    </div>
  );
}

const AGENT_LABELS: Record<string, string> = {
  infra: "Infrastructure",
  payments: "Payments",
  comms: "Email",
  deployer: "Deployer",
};

export function OutputPanel({ state }: { state: ProjectState }) {
  const hasRuns = state.runs && state.runs.length > 0;
  const hasLogs = state.logs && state.logs.length > 0;
  const isDone = state.phase === "done";
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollTo({ top: logEndRef.current.scrollHeight, behavior: "smooth" });
  }, [state.logs?.length]);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      {/* Phase indicator */}
      <div className="rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-2.5 w-2.5 rounded-full ${
            state.phase === "done" ? "bg-emerald-400" :
            state.phase === "idle" ? "bg-zinc-600" : "bg-indigo-400 animate-pulse"
          }`} />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</span>
        </div>
        <p className="text-sm font-medium text-zinc-200">{PHASE_LABELS[state.phase] || state.phase}</p>
        {state.name && (
          <p className="text-xs text-zinc-500 mt-1">Project: {state.name}</p>
        )}
      </div>

      {/* Brainbase orchestration */}
      {state.orchestrationId && (
        <div className="rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Brainbase Orchestration</span>
          </div>
          <p className="text-[10px] text-zinc-600 font-mono">{state.orchestrationId}</p>
        </div>
      )}

      {/* Agent runs */}
      {hasRuns && (
        <div className="rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Agent Team</span>
          </div>
          <div className="divide-y divide-zinc-700/30">
            {state.runs!.map((run) => (
              <AgentRow
                key={run.agent}
                name={AGENT_LABELS[run.agent] || run.agent}
                status={run.status}
                brainbaseId={run.brainbase_agent_id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Technical log */}
      {hasLogs && (
        <div className="rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Technical Log</span>
          </div>
          <div ref={logEndRef} className="space-y-2 max-h-64 overflow-y-auto">
            {state.logs!.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[10px] text-zinc-600 font-mono whitespace-nowrap mt-0.5">
                  {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] text-indigo-400 font-medium">{AGENT_LABELS[entry.agent] || entry.agent}</span>
                  <p className="text-[11px] text-zinc-400 leading-relaxed break-words">{entry.message}</p>
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
                <p className="text-[10px] text-zinc-500 truncate">{state.workerUrl}</p>
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
                <p className="text-[10px] text-zinc-500 truncate">Live checkout session</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-violet-400/50 group-hover:text-violet-400 transition-colors" />
            </a>
          )}

          {state.emailSent && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Mail className="h-4 w-4 text-indigo-400" />
              <div>
                <p className="text-xs font-medium text-indigo-400">Welcome Email</p>
                <p className="text-[10px] text-zinc-500">Sent via Postmark</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {state.phase === "idle" && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center mb-4">
            <Globe className="h-5 w-5 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-600">Your project output will appear here</p>
          <p className="text-xs text-zinc-700 mt-1">Live site, checkout link, email status</p>
        </div>
      )}

      {state.phase === "chatting" && !hasRuns && (
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
            <BrainCircuit className="h-5 w-5 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-sm text-zinc-500">Understanding your idea</p>
          <p className="text-xs text-zinc-600 mt-1">Answer the questions to refine the plan</p>
        </div>
      )}
    </div>
  );
}
