import { useChatStore } from "../lib/stores/chatStore";
import type { ApiMessage } from "../lib/api/types";

function formatTime(ts?: number) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

interface Props {
  message: ApiMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const retryMessage = useChatStore((s) => s.retryMessage);

  return (
    <div className={`my-2 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-lg whitespace-pre-wrap ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
        }`}
      >
        <div>{message.content}</div>
        <div className="text-xs text-gray-400 mt-1 text-right">
          {formatTime((message as any).timestamp)}
        </div>
        {isUser && message.status === "pending" && (
          <div className="text-xs text-gray-300 mt-1">Sending…</div>
        )}
        {isUser && message.status === "failed" && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-red-400">Failed to send</span>
            <button
              className="text-xs px-2 py-1 bg-gray-700 rounded-md"
              onClick={() => retryMessage(message.id)}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
