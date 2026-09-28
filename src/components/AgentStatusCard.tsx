interface AgentRun {
  agent: string;
  status: string;
  output?: string;
}

const AGENT_LABELS: Record<string, string> = {
  planner: "Planner",
  infra: "Infrastructure",
  payments: "Payments",
  comms: "Email",
  deployer: "Deployer",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-zinc-500",
  running: "text-amber-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

function getAgentSummary(agent: string, output?: string): string | null {
  if (!output) return null;

  try {
    const data = JSON.parse(output);

    switch (agent) {
      case "infra":
        return data.workerUrl ? `Deployed to ${data.workerUrl}` : null;
      case "payments":
        return data.checkoutUrl ? "Checkout ready" : null;
      case "comms":
        return data.emailSent ? "Email sent" : null;
      case "deployer":
        return data.redeployed ? "Landing page updated" : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function AgentStatusCard({ runs }: { runs: AgentRun[] }) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 max-w-[80%]">
      <p className="text-xs text-indigo-400 font-medium mb-3">Agent Team</p>
      <div className="space-y-2">
        {runs.map((run) => {
          const summary = run.status === "completed" ? getAgentSummary(run.agent, run.output) : null;

          return (
            <div key={run.agent} className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${
                  run.status === "running" ? "bg-amber-400 animate-pulse" :
                  run.status === "completed" ? "bg-emerald-400" :
                  run.status === "failed" ? "bg-red-400" : "bg-zinc-600"
                }`} />
                <span className="text-sm text-zinc-300 flex-1">{AGENT_LABELS[run.agent] || run.agent}</span>
                <span className={`text-xs font-mono ${STATUS_COLORS[run.status] || "text-zinc-500"}`}>
                  {run.status}
                </span>
              </div>
              {summary && (
                <div className="ml-5 text-xs text-zinc-500">
                  {summary}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
