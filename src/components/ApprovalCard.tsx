import { useTheme } from "../App";

interface ApprovalCardProps {
  plan: { name: string; tasks: string[] };
  onApprove: () => void;
  loading?: boolean;
}

export function ApprovalCard({ plan, onApprove, loading }: ApprovalCardProps) {
  const isDark = useTheme() === "dark";

  return (
    <div className={`backdrop-blur-sm border rounded-2xl p-5 max-w-[95%] ${isDark ? "bg-zinc-800/80 border-zinc-700/30" : "bg-white/80 border-stone-200/60 shadow-sm"}`}>
      <p className="text-xs text-indigo-500 font-medium mb-2">Planner</p>
      <p className={`text-sm font-medium mb-3 ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>Here's the plan for {plan.name}:</p>
      <ol className="space-y-1.5 mb-4">
        {plan.tasks.map((task, i) => (
          <li key={i} className={`text-sm flex gap-2 ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
            <span className={`font-mono text-xs mt-0.5 ${isDark ? "text-zinc-500" : "text-stone-400"}`}>{i + 1}.</span>
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
