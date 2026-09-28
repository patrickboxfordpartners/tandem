import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { MessageBubble } from "./MessageBubble";
import { ApprovalCard } from "./ApprovalCard";
import { AgentStatusCard } from "./AgentStatusCard";
import { Send } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "agent";
  agent?: string;
  content: string;
  type?: "text" | "plan" | "status" | "result";
  plan?: { name: string; tasks: string[] };
  runs?: Array<{ agent: string; status: string; output?: string }>;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "agent",
    agent: "Tandem",
    content: "Describe what you want to build. I'll handle the infrastructure, payments, email, and deployment.",
  }]);
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "planning" | "approval" | "executing" | "done">("idle");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pollProject = useCallback(async (id: string) => {
    try {
      const data = await api<any>(`/api/projects/${id}`);
      const runs = data.runs || [];

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.type !== "status");
        return [...filtered, {
          id: "status-" + Date.now(),
          role: "agent" as const,
          type: "status" as const,
          content: "",
          runs,
        }];
      });

      const allDone = runs.length > 0 && runs.every((r: any) => r.status === "completed" || r.status === "failed");
      if (allDone || data.status === "deployed" || data.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);

        const output: string[] = [];
        if (data.worker_url) output.push("Site: " + data.worker_url);
        if (data.stripe_checkout_url) output.push("Checkout: " + data.stripe_checkout_url);
        if (data.email_sent) output.push("Welcome email sent");

        setMessages((prev) => [...prev, {
          id: "result-" + Date.now(),
          role: "agent" as const,
          agent: "Tandem",
          content: output.length > 0
            ? "Your project is live:\n\n" + output.join("\n")
            : "Project provisioning complete.",
          type: "result" as const,
        }]);
        setPhase("done");
      }
    } catch {
      // poll failed, keep trying
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || phase !== "idle") return;
    const brief = input.trim();
    setInput("");

    setMessages((prev) => [...prev, {
      id: "user-" + Date.now(),
      role: "user",
      content: brief,
    }]);

    setPhase("planning");

    try {
      const { id } = await api<{ id: string }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ brief }),
      });
      setProjectId(id);

      const planResult = await api<{ plan: { name: string; tasks: string[] } }>(`/api/projects/${id}/plan`, {
        method: "POST",
      });

      setMessages((prev) => [...prev, {
        id: "plan-" + Date.now(),
        role: "agent" as const,
        type: "plan" as const,
        content: "",
        plan: planResult.plan,
      }]);
      setPhase("approval");
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: "error-" + Date.now(),
        role: "agent",
        agent: "Tandem",
        content: "Something went wrong: " + err.message,
      }]);
      setPhase("idle");
    }
  };

  const handleApprove = async () => {
    if (!projectId) return;
    setPhase("executing");

    try {
      await api(`/api/projects/${projectId}/approve`, { method: "POST" });
      await api(`/api/projects/${projectId}/execute`, { method: "POST" });

      pollRef.current = setInterval(() => pollProject(projectId), 2000);
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: "error-" + Date.now(),
        role: "agent",
        agent: "Tandem",
        content: "Execution failed: " + err.message,
      }]);
      setPhase("idle");
    }
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => {
          if (msg.type === "plan" && msg.plan) {
            return <ApprovalCard key={msg.id} plan={msg.plan} onApprove={handleApprove} loading={phase === "executing"} />;
          }
          if (msg.type === "status" && msg.runs) {
            return <AgentStatusCard key={msg.id} runs={msg.runs} />;
          }
          return <MessageBubble key={msg.id} role={msg.role} agent={msg.agent} content={msg.content} />;
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Describe what you want to build..."
            disabled={phase !== "idle" && phase !== "done"}
            className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || (phase !== "idle" && phase !== "done")}
            className="px-4 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
