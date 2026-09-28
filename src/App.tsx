import { useState } from "react";
import { Chat } from "./components/Chat";

export default function App() {
  const [projectCount, setProjectCount] = useState(0);

  return (
    <div className="h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">T</div>
        <h1 className="text-lg font-semibold tracking-tight">Tandem</h1>
        <span className="text-xs text-zinc-500">Your AI technical co-founder</span>
        {projectCount > 0 && (
          <div className="ml-auto">
            <span className="text-xs text-zinc-600 font-mono">
              {projectCount} {projectCount === 1 ? "project" : "projects"} launched
            </span>
          </div>
        )}
      </header>
      <Chat onProjectComplete={() => setProjectCount((prev) => prev + 1)} />
    </div>
  );
}
