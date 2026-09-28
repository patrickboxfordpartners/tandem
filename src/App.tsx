import { useState } from "react";

export default function App() {
  return (
    <div className="h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">T</div>
        <h1 className="text-lg font-semibold">Tandem</h1>
        <span className="text-xs text-zinc-500">Your AI technical co-founder</span>
      </header>
      <main className="flex-1 flex items-center justify-center text-zinc-500">
        Chat UI goes here
      </main>
    </div>
  );
}
