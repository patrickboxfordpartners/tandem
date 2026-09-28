interface ApprovalCardProps {
  plan: { name: string; tasks: string[] };
  onApprove: () => void;
  loading?: boolean;
}

export function ApprovalCard({ plan, onApprove, loading }: ApprovalCardProps) {
  return (
    <div className="bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/30 rounded-2xl p-5 max-w-[80%]">
      <p className="text-xs text-indigo-400 font-medium mb-2">Planner</p>
      <p className="text-sm font-medium text-zinc-100 mb-3">Here's the plan for {plan.name}:</p>
      <ol className="space-y-1.5 mb-4">
        {plan.tasks.map((task, i) => (
          <li key={i} className="text-sm text-zinc-300 flex gap-2">
            <span className="text-zinc-500 font-mono text-xs mt-0.5">{i + 1}.</span>
            {task}
          </li>
        ))}
      </ol>
      <button
        onClick={onApprove}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
      >
        {loading ? "Launching..." : "Approve & Launch"}
      </button>
    </div>
  );
}
