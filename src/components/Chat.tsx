import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { MessageBubble } from "./MessageBubble";
import { ApprovalCard } from "./ApprovalCard";
import { Send } from "lucide-react";
import { useTheme } from "../App";

interface Message {
  id: string;
  role: "user" | "agent";
  agent?: string;
  content: string;
  type?: "text" | "plan" | "status" | "result";
  plan?: { name: string; tasks: string[] };
  runs?: Array<{ agent: string; status: string; output?: string; brainbase_agent_id?: string }>;
  orchestrationId?: string;
}

interface ChatProps {
  onProjectComplete?: () => void;
  onStateChange?: (state: import("../App").ProjectState) => void;
}

export function Chat({ onProjectComplete, onStateChange }: ChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "agent",
    agent: "Tandem",
    content: "I'm your technical co-founder. I'm here to make sure we get everything done correctly, and that nothing technical falls through the cracks. We've got a lot of work to do, so let's get started. What are we working on?",
  }]);
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "chatting" | "planning" | "approval" | "executing" | "done">("idle");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pollProject = useCallback(async (id: string) => {
    try {
      const data = await api<any>(`/api/projects/${id}`);
      const runs = data.runs || [];

      onStateChange?.({
        phase: "executing",
        runs,
        logs: data.logs || [],
        orchestrationId: data.brainbase_orchestration_id,
        name: data.name,
      });

      const allDone = runs.length > 0 && runs.every((r: any) => r.status === "completed" || r.status === "failed");
      if (allDone || data.status === "deployed" || data.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);

        const elapsed = startTimeRef.current > 0
          ? ((Date.now() - startTimeRef.current) / 1000).toFixed(1)
          : "0.0";

        const output: string[] = [];
        if (data.worker_url) output.push("Site: " + data.worker_url);
        if (data.stripe_checkout_url) output.push("Checkout: " + data.stripe_checkout_url);
        if (data.email_sent) output.push("Welcome email sent");

        setMessages((prev) => [...prev, {
          id: "result-" + Date.now(),
          role: "agent" as const,
          agent: "Tandem",
          content: output.length > 0
            ? `Done in ${elapsed}s. Check the output panel for your live links.`
            : `Project provisioning complete (${elapsed}s).`,
          type: "result" as const,
        }]);
        setPhase("done");
        onStateChange?.({
          phase: "done",
          runs,
          logs: data.logs || [],
          orchestrationId: data.brainbase_orchestration_id,
          name: data.name,
          workerUrl: data.worker_url,
          checkoutUrl: data.stripe_checkout_url,
          emailSent: !!data.email_sent,
        });
        onProjectComplete?.();
      }
    } catch {
      // poll failed, keep trying
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");

    setMessages((prev) => [...prev, {
      id: "user-" + Date.now(),
      role: "user",
      content: text,
    }]);

    setLoading(true);

    try {
      if (!projectId) {
        // First message: create project and start conversation
        const { id } = await api<{ id: string }>("/api/projects", {
          method: "POST",
          body: JSON.stringify({ brief: text }),
        });
        setProjectId(id);
        setPhase("chatting");
        onStateChange?.({ phase: "chatting" });

        // Get first response from co-founder
        const chatResult = await api<{ response: string; ready: boolean }>(`/api/projects/${id}/chat`, {
          method: "POST",
        });

        setMessages((prev) => [...prev, {
          id: "agent-" + Date.now(),
          role: "agent",
          agent: "Tandem",
          content: chatResult.response,
        }]);

        if (chatResult.ready) {
          await generatePlan(id);
        }
      } else {
        // Follow-up message: continue conversation
        const chatResult = await api<{ response: string; ready: boolean }>(`/api/projects/${projectId}/chat`, {
          method: "POST",
          body: JSON.stringify({ message: text }),
        });

        setMessages((prev) => [...prev, {
          id: "agent-" + Date.now(),
          role: "agent",
          agent: "Tandem",
          content: chatResult.response,
        }]);

        if (chatResult.ready) {
          await generatePlan(projectId);
        }
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: "error-" + Date.now(),
        role: "agent",
        agent: "Tandem",
        content: "Something went wrong: " + err.message,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async (id: string) => {
    setPhase("planning");
    onStateChange?.({ phase: "planning" });

    setMessages((prev) => [...prev, {
      id: "planning-" + Date.now(),
      role: "agent",
      agent: "Tandem",
      content: "Got it. Let me put together a plan...",
    }]);

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
  };

  const handleApprove = async () => {
    if (!projectId) return;
    setPhase("executing");
    startTimeRef.current = Date.now();

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
      setPhase("chatting");
    }
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleReset = () => {
    setMessages([{
      id: "welcome",
      role: "agent",
      agent: "Tandem",
      content: "I'm your technical co-founder. I'm here to make sure we get everything done correctly, and that nothing technical falls through the cracks. We've got a lot of work to do, so let's get started. What are we working on?",
    }]);
    setPhase("idle");
    setProjectId(null);
    setLoading(false);
    startTimeRef.current = 0;
    onStateChange?.({ phase: "idle" });
  };

  const canType = (phase === "idle" || phase === "chatting" || phase === "done") && !loading;
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div className="p-6 space-y-4" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {messages.map((msg) => {
          if (msg.type === "plan" && msg.plan) {
            return <ApprovalCard key={msg.id} plan={msg.plan} onApprove={handleApprove} loading={phase === "executing"} />;
          }
          return <MessageBubble key={msg.id} role={msg.role} agent={msg.agent} content={msg.content} />;
        })}
        {loading && (
          <div className="flex justify-start">
            <div className={`backdrop-blur-sm border rounded-2xl px-4 py-3 ${isDark ? "bg-zinc-800/80 border-zinc-700/30" : "bg-white/80 border-stone-200/60"}`}>
              <p className="text-xs text-indigo-400 font-medium mb-1">Tandem</p>
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        {phase === "done" && (
          <div className="flex justify-start">
            <button
              onClick={handleReset}
              className="text-sm text-indigo-400 hover:text-indigo-300 underline transition-colors"
            >
              Start another project
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className={`p-4 border-t backdrop-blur-md ${isDark ? "border-zinc-800/60 bg-zinc-950/50" : "border-stone-200/60 bg-white/50"}`}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={phase === "idle" ? "Tell me what you want to build..." : phase === "chatting" ? "Answer Tandem's questions..." : "Describe what you want to build..."}
            disabled={!canType}
            className={`flex-1 px-4 py-3 rounded-xl backdrop-blur-sm border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 disabled:opacity-50 transition-all ${isDark ? "bg-zinc-800/70 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-500" : "bg-white/80 border-stone-200 text-zinc-900 placeholder:text-stone-400"}`}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !canType}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20 disabled:shadow-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
