import { useTheme } from "../App";

interface MessageBubbleProps {
  role: "user" | "agent";
  agent?: string;
  content: string;
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 underline hover:text-indigo-300 transition-colors"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function MessageBubble({ role, agent, content }: MessageBubbleProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser
          ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/10"
          : isDark
            ? "bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/30 text-zinc-100"
            : "bg-white/80 backdrop-blur-sm border border-stone-200/60 text-zinc-900 shadow-sm"
      }`}>
        {agent && <p className="text-xs text-indigo-500 font-medium mb-1">{agent}</p>}
        <p className="text-sm whitespace-pre-wrap">{linkify(content)}</p>
      </div>
    </div>
  );
}
